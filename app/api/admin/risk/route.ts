import { NextResponse } from "next/server";
import { getPlatformRiskStats, getLiquidationWarnings } from "@/lib/liquidation";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/risk
 *
 * Risk exposure report untuk admin dashboard.
 */
export async function GET() {
  try {
    const [riskStats, warnings, recentLiquidations] = await Promise.all([
      getPlatformRiskStats(),
      getLiquidationWarnings(30), // 30% threshold
      prisma.liquidationLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          position: {
            include: {
              project: {
                select: { tokenSymbol: true, tokenName: true },
              },
            },
          },
        },
      }),
    ]);

    // Hitung total platform loss dari likuidasi
    const totalPlatformLoss = recentLiquidations.reduce(
      (sum, l) => sum + Number(l.platformLoss),
      0
    );

    // Hitung total user refund dari likuidasi
    const totalUserRefund = recentLiquidations.reduce(
      (sum, l) => sum + Number(l.userRefund || 0),
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        risk: riskStats,
        warnings,
        recentLiquidations: {
          count: recentLiquidations.length,
          totalPlatformLoss,
          totalUserRefund,
          logs: recentLiquidations,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching risk data:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
