import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentPrice, graduationProgress } from "@/lib/bonding-curve";
import { getCachedPrice } from "@/lib/price";

/**
 * GET /api/pools/[projectId]
 *
 * Info liquidity pool (bonding curve) untuk project.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    const pool = await prisma.liquidityPool.findUnique({
      where: { projectId },
      include: {
        project: {
          select: {
            tokenName: true,
            tokenSymbol: true,
            contractAddress: true,
            chain: true,
          },
        },
      },
    });

    if (!pool) {
      return NextResponse.json(
        { success: false, error: "Pool not found" },
        { status: 404 }
      );
    }

    // Calculate current price
    const price = pool.isGraduated
      ? await getCachedPrice(pool.chain || "ethereum", pool.dexPairAddress)
      : currentPrice(
          Number(pool.basePrice),
          Number(pool.slope || 0),
          Number(pool.totalSold)
        );

    const progress = graduationProgress(
      Number(pool.totalRaised),
      Number(pool.graduationCap)
    );

    return NextResponse.json({
      success: true,
      data: {
        ...pool,
        currentPrice: price,
        graduationProgress: progress,
        dexPairAddress: pool.dexPairAddress,
        dexName: pool.dexName,
      },
    });
  } catch (error) {
    console.error("Error fetching pool:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
