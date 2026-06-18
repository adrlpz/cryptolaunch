import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { simulateBuy } from "@/lib/bonding-curve";
import { getUserByWallet, isValidEthAddress } from "@/lib/auth";
import { rateLimitMiddleware } from "@/lib/rate-limit";

/**
 * POST /api/pools/[projectId]/buy
 *
 * Beli token dari bonding curve.
 *
 * Body:
 *   - walletAddress: string
 *   - ethAmount: number (ETH yang dikirim)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    // Rate limit: 30 requests per minute per IP
    const rateLimited = await rateLimitMiddleware(request, 30, 60_000);
    if (rateLimited) return rateLimited;

    const { projectId } = await params;
    const body = await request.json();
    const { walletAddress, ethAmount } = body;

    if (!walletAddress || !ethAmount || Number(ethAmount) <= 0) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid fields" },
        { status: 400 }
      );
    }

    // Validate wallet address format
    if (!isValidEthAddress(walletAddress)) {
      return NextResponse.json(
        { success: false, error: "Invalid wallet address" },
        { status: 400 }
      );
    }

    // Verify user exists (has connected wallet)
    const user = await getUserByWallet(walletAddress);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Wallet not registered. Please connect wallet first." },
        { status: 401 }
      );
    }

    // Validate ethAmount bounds
    const ethNum = Number(ethAmount);
    if (ethNum > 1000) {
      return NextResponse.json(
        { success: false, error: "ETH amount exceeds maximum per transaction (1000 ETH)" },
        { status: 400 }
      );
    }

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
        { success: false, error: "Token has graduated to DEX. Trade on DEX instead." },
        { status: 400 }
      );
    }

    const result = simulateBuy(
      Number(pool.basePrice),
      Number(pool.slope || 0),
      Number(pool.totalSold),
      ethNum,
      Number(pool.graduationCap),
      Number(pool.totalRaised),
      Number(pool.currentReserveToken)
    );

    if (result.tokensOut <= 0) {
      return NextResponse.json(
        { success: false, error: "Insufficient ETH for any tokens" },
        { status: 400 }
      );
    }

    // Verify tokensOut doesn't exceed available supply
    if (result.tokensOut > Number(pool.currentReserveToken)) {
      return NextResponse.json(
        { success: false, error: "Purchase exceeds available token supply" },
        { status: 400 }
      );
    }

    const updatedPool = await prisma.liquidityPool.update({
      where: { id: pool.id },
      data: {
        totalSold: { increment: result.tokensOut },
        totalRaised: { increment: result.ethIn }, // track gross ETH
        currentReserveToken: { decrement: result.tokensOut },
        currentReserveNative: { increment: result.ethAfterFee },
        isGraduated: result.isGraduated,
      },
    });

    if (result.isGraduated) {
      await prisma.launchpadProject.update({
        where: { id: projectId },
        data: { lpStatus: "graduated", status: "active" },
      });
    }

    return NextResponse.json({
      success: true,
      data: { ...result, poolStatus: updatedPool },
    });
  } catch (error) {
    console.error("Error buying from curve:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
