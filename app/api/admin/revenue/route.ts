import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/revenue
 *
 * Revenue breakdown per source.
 */
export async function GET() {
  try {
    // Get all open positions for margin fee calculation
    const openPositions = await prisma.marginPosition.findMany({
      where: { status: "open" },
    });

    // Get closed/liquidated positions for historical fees
    const closedPositions = await prisma.marginPosition.findMany({
      where: { status: { in: ["closed", "liquidated"] } },
    });

    // Get all launches for deploy fee
    const launches = await prisma.tokenLaunch.findMany({
      where: { status: { in: ["deployed", "active", "ended"] } },
    });

    // Get all pools for trading fee estimate
    const pools = await prisma.liquidityPool.findMany();

    // Calculate revenue
    const marginFeeOpen = openPositions.reduce(
      (sum, p) => sum + Number(p.feeAmount),
      0
    );

    const marginFeeHistorical = closedPositions.reduce(
      (sum, p) => sum + Number(p.feeAmount),
      0
    );

    const deployFeeRevenue = launches.reduce(
      (sum, l) => sum + Number(l.deployFeeNative || 0),
      0
    );

    const platformFeeFromGraduation = launches.reduce(
      (sum, l) => sum + Number(l.platformFeeAmount || 0),
      0
    );

    // Trading fee estimate (1% of total raised, 50% to platform)
    const tradingFeeRevenue = pools.reduce(
      (sum, p) => sum + Number(p.totalRaised) * 0.01 * 0.5,
      0
    );

    // Insurance fund (20% of all fees)
    const totalFees =
      marginFeeOpen +
      marginFeeHistorical +
      platformFeeFromGraduation +
      tradingFeeRevenue;
    const insuranceFund = totalFees * 0.2;

    return NextResponse.json({
      success: true,
      data: {
        revenue: {
          marginFee: {
            open: marginFeeOpen,
            historical: marginFeeHistorical,
            total: marginFeeOpen + marginFeeHistorical,
          },
          deployFee: deployFeeRevenue,
          platformFee: platformFeeFromGraduation,
          tradingFee: tradingFeeRevenue,
          total: totalFees,
        },
        insuranceFund,
        breakdown: {
          marginPercent:
            totalFees > 0
              ? ((marginFeeOpen + marginFeeHistorical) / totalFees) * 100
              : 0,
          deployPercent:
            totalFees > 0 ? (deployFeeRevenue / totalFees) * 100 : 0,
          platformPercent:
            totalFees > 0 ? (platformFeeFromGraduation / totalFees) * 100 : 0,
          tradingPercent:
            totalFees > 0 ? (tradingFeeRevenue / totalFees) * 100 : 0,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching revenue:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
