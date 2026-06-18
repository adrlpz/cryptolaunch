import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ethers } from "ethers";
import { FACTORY_ABI } from "@/lib/factory-abi";
import { rateLimitMiddleware } from "@/lib/rate-limit";

/**
 * POST /api/launch/[id]/confirm-deploy
 *
 * User signed the deploy tx and contract is on-chain. Verify and update DB.
 *
 * Verification:
 * 1. Tx exists and succeeded
 * 2. Tx was sent to our factory contract
 * 3. LaunchCreated event emitted with matching token address
 * 4. Contract code exists at predicted address
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limit: 5 requests per minute per IP
    const rateLimited = await rateLimitMiddleware(request, 5, 60_000);
    if (rateLimited) return rateLimited;

    const { id } = await params;
    const body = await request.json();
    const { txHash, walletAddress } = body;

    if (!txHash || !walletAddress) {
      return NextResponse.json(
        { success: false, error: "Missing txHash or walletAddress" },
        { status: 400 }
      );
    }

    // Get launch
    const launch = await prisma.tokenLaunch.findUnique({
      where: { id },
    });

    if (!launch) {
      return NextResponse.json(
        { success: false, error: "Launch not found" },
        { status: 404 }
      );
    }

    // Verify user is the creator
    const user = await prisma.user.findUnique({
      where: { id: launch.creatorId },
    });

    if (!user || user.walletAddress !== walletAddress.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
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

    // Get tx receipt
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) {
      return NextResponse.json(
        { success: false, error: "Transaction not found or not confirmed" },
        { status: 400 }
      );
    }

    if (receipt.status !== 1) {
      return NextResponse.json(
        { success: false, error: "Transaction failed on-chain" },
        { status: 400 }
      );
    }

    // Verify tx sender matches the wallet address
    const tx = await provider.getTransaction(txHash);
    if (!tx || tx.from?.toLowerCase() !== walletAddress.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: "Transaction sender does not match wallet" },
        { status: 403 }
      );
    }

    // Verify tx was sent to our factory
    const factoryAddress = process.env.LAUNCHPAD_FACTORY_ADDRESS;
    if (!factoryAddress) {
      return NextResponse.json(
        { success: false, error: "Factory address not configured" },
        { status: 500 }
      );
    }

    if (receipt.to?.toLowerCase() !== factoryAddress.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: "Transaction was not sent to the factory contract" },
        { status: 400 }
      );
    }

    // Parse LaunchCreated event from receipt
    const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, provider);
    let deployedToken: string | null = null;
    let deployedCurve: string | null = null;

    for (const log of receipt.logs) {
      try {
        const parsed = factory.interface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
        if (parsed && parsed.name === "LaunchCreated") {
          deployedToken = parsed.args.token;
          deployedCurve = parsed.args.bondingCurve;
          break;
        }
      } catch {
        // Not our event, skip
      }
    }

    if (!deployedToken) {
      return NextResponse.json(
        { success: false, error: "No LaunchCreated event found in transaction" },
        { status: 400 }
      );
    }

    // Verify deployed address matches prediction
    if (deployedToken.toLowerCase() !== launch.contractAddress?.toLowerCase()) {
      return NextResponse.json(
        {
          success: false,
          error: "Deployed token address does not match prediction",
          predicted: launch.contractAddress,
          actual: deployedToken,
        },
        { status: 400 }
      );
    }

    // Verify contract code exists at predicted address
    const code = await provider.getCode(deployedToken);
    if (!code || code === "0x") {
      return NextResponse.json(
        { success: false, error: "No contract code at predicted address" },
        { status: 400 }
      );
    }

    // Update launch status
    await prisma.tokenLaunch.update({
      where: { id },
      data: {
        status: "deployed",
        deployTxHash: txHash,
        deployedAt: new Date(),
      },
    });

    // Create LaunchpadProject record
    const project = await prisma.launchpadProject.upsert({
      where: { launchId: launch.id },
      update: {},
      create: {
        launchId: launch.id,
        tokenName: launch.tokenName,
        tokenSymbol: launch.tokenSymbol,
        contractAddress: launch.contractAddress,
        tokenPrice: launch.basePrice,
        totalSupply: launch.totalSupply,
        availableSupply: Number(launch.totalSupply) * 0.8,
        chain: launch.network,
        maxLeveragePercent: launch.maxLeveragePercent,
        status: "upcoming",
        launchDate: launch.launchDate,
      },
    });

    // Compute slope for bonding curve
    const slope = Math.max(
      0,
      (2 *
        (Number(launch.graduationCap) -
          Number(launch.basePrice) * Number(launch.totalSupply))) /
        (Number(launch.totalSupply) * Number(launch.totalSupply))
    );

    // Create LiquidityPool
    await prisma.liquidityPool.create({
      data: {
        projectId: project.id,
        chain: launch.network,
        basePrice: Number(launch.basePrice),
        slope,
        graduationCap: Number(launch.graduationCap),
        currentReserveToken: Number(launch.totalSupply) * 0.8,
        currentReserveNative: 0,
        totalSold: 0,
        totalRaised: 0,
        isGraduated: false,
      },
    });

    // Update launch to mark project created
    await prisma.tokenLaunch.update({
      where: { id },
      data: { projectId: project.id },
    });

    return NextResponse.json({
      success: true,
      data: {
        launchId: launch.id,
        projectId: project.id,
        contractAddress: launch.contractAddress,
        deployedToken,
        deployedCurve,
        txHash,
        status: "deployed",
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error confirming deploy:", msg);
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
