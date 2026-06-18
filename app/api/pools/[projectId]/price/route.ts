import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentPrice, graduationProgress } from "@/lib/bonding-curve";
import { getCachedPrice } from "@/lib/price";

/**
 * GET /api/pools/[projectId]/price
 *
 * Harga saat ini dari bonding curve.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    const pool = await prisma.liquidityPool.findUnique({
      where: { projectId },
    });

    if (!pool) {
      return NextResponse.json(
        { success: false, error: "Pool not found" },
        { status: 404 }
      );
    }

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
        price,
        isGraduated: pool.isGraduated,
        dexPairAddress: pool.dexPairAddress,
        totalSold: pool.totalSold,
        totalRaised: pool.totalRaised,
        graduationCap: pool.graduationCap,
        graduationProgress: progress,
      },
    });
  } catch (error) {
    console.error("Error fetching price:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
