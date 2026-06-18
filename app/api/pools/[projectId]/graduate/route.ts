import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ethers } from "ethers";
import { getDexInfo } from "@/lib/dex";
import { rateLimitMiddleware } from "@/lib/rate-limit";
import { BONDING_CURVE_ABI } from "@/lib/bonding-curve-abi";

/**
 * POST /api/pools/[projectId]/graduate
 *
 * Confirm DEX graduation after on-chain graduateToDEX() tx.
 *
 * Body:
 *   - txHash: string
 *   - walletAddress: string
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    // Rate limit: 5 requests per minute per IP
    const rateLimited = await rateLimitMiddleware(request, 5, 60_000);
    if (rateLimited) return rateLimited;

    const { projectId } = await params;
    const body = await request.json();
    const { txHash, walletAddress } = body;

    if (!txHash || !walletAddress) {
      return NextResponse.json(
        { success: false, error: "Missing txHash or walletAddress" },
        { status: 400 }
      );
    }

    // Get pool
    const pool = await prisma.liquidityPool.findUnique({
      where: { projectId },
      include: { project: true },
    });

    if (!pool) {
      return NextResponse.json(
        { success: false, error: "Pool not found" },
        { status: 404 }
      );
    }

    if (pool.isGraduated) {
      return NextResponse.json(
        { success: false, error: "Already graduated to DEX" },
        { status: 400 }
      );
    }

    // Verify tx on-chain
    const rpcUrl = process.env.ETH_RPC_URL || process.env.SEPOLIA_RPC_URL;
    if (!rpcUrl) {
      return NextResponse.json(
        { success: false, error: "RPC URL not configured" },
        { status: 500 }
      );
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt || receipt.status !== 1) {
      return NextResponse.json(
        { success: false, error: "Transaction not found or failed" },
        { status: 400 }
      );
    }

    // Verify tx sent to the bonding curve contract
    if (receipt.to?.toLowerCase() !== pool.project.contractAddress?.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: "Transaction was not sent to the bonding curve contract" },
        { status: 400 }
      );
    }

    // Parse DEXLiquidityAdded event
    const curve = new ethers.Contract(
      pool.project.contractAddress!,
      BONDING_CURVE_ABI,
      provider
    );

    let tokenAmount: bigint | null = null;
    let ethAmount: bigint | null = null;
    let liquidity: bigint | null = null;

    for (const log of receipt.logs) {
      try {
        const parsed = curve.interface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
        if (parsed && parsed.name === "DEXLiquidityAdded") {
          tokenAmount = parsed.args.tokenAmount;
          ethAmount = parsed.args.ethAmount;
          liquidity = parsed.args.liquidity;
          break;
        }
      } catch {
        // Not our event
      }
    }

    if (!tokenAmount || !ethAmount) {
      return NextResponse.json(
        { success: false, error: "No DEXLiquidityAdded event found" },
        { status: 400 }
      );
    }

    // Get pair address from contract
    const pairAddress = await curve.dexPairAddress() as string;

    // Get DEX info (reserves, price)
    const chain = pool.project.chain || "ethereum";
    const tokenAddress = pool.project.contractAddress!;
    let dexPrice: number | null = null;
    let tokenReserve: string | null = null;
    let ethReserve: string | null = null;

    try {
      const dexInfo = await getDexInfo(chain, tokenAddress, provider);
      if (dexInfo) {
        dexPrice = dexInfo.price;
        tokenReserve = dexInfo.tokenReserve;
        ethReserve = dexInfo.ethReserve;
      }
    } catch (err) {
      console.warn("Failed to fetch DEX info:", err);
    }

    // Update pool with DEX data
    await prisma.liquidityPool.update({
      where: { id: pool.id },
      data: {
        isGraduated: true,
        dexName: "uniswap_v2",
        dexPairAddress: pairAddress,
        tokenReserve: tokenReserve ? Number(tokenReserve) : null,
        nativeReserve: ethReserve ? Number(ethReserve) : null,
      },
    });

    // Update project status
    await prisma.launchpadProject.update({
      where: { id: projectId },
      data: {
        lpStatus: "graduated",
        status: "active",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        projectId,
        pairAddress,
        dexPrice,
        tokenReserve,
        ethReserve,
        lpBurned: true,
        txHash,
      },
    });
  } catch (error) {
    console.error("Error confirming graduation:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
