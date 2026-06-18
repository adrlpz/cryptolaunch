import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { simulateSell } from "@/lib/bonding-curve";
import { getUserByWallet, isValidEthAddress } from "@/lib/auth";
import { rateLimitMiddleware } from "@/lib/rate-limit";

/**
 * POST /api/pools/[projectId]/sell
 *
 * Jual token ke bonding curve.
 *
 * Body:
 *   - walletAddress: string
 *   - tokenAmount: number
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
    const { walletAddress, tokenAmount } = body;

    if (!walletAddress || !tokenAmount || Number(tokenAmount) <= 0) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid fields" },
        { status: 400 }
      );
    }

    if (!isValidEthAddress(walletAddress)) {
      return NextResponse.json(
        { success: false, error: "Invalid wallet address" },
        { status: 400 }
      );
    }

    const user = await getUserByWallet(walletAddress);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Wallet not registered. Please connect wallet first." },
        { status: 401 }
      );
    }

    const pool = await prisma.liquidityPool.findUnique({
      where: { projectId },
    });

    if (!pool) {
      return NextResponse.json(
        { success: false, error: "Pool not found" },
        { status: 404 }
      );
    }

    if (pool.isGraduated) {
      return NextResponse.json(
        { success: false, error: "Token has graduated. Sell on DEX instead." },
        { status: 400 }
      );
    }

    const result = simulateSell(
      Number(pool.basePrice),
      Number(pool.slope || 0),
      Number(pool.totalSold),
      Number(tokenAmount)
    );

    if (result.ethOut <= 0) {
      return NextResponse.json(
        { success: false, error: "Token amount too small" },
        { status: 400 }
      );
    }

    await prisma.liquidityPool.update({
      where: { id: pool.id },
      data: {
        totalSold: { decrement: result.tokensIn },
        totalRaised: { decrement: result.ethOut },
        currentReserveToken: { increment: result.tokensIn },
        currentReserveNative: { decrement: result.ethOut },
      },
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error selling to curve:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
