import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/dashboard
 *
 * Overview data untuk admin dashboard.
 */
export async function GET() {
  try {
    const [
      totalUsers,
      totalProjects,
      activeProjects,
      openPositions,
      totalLiquidations,
      recentPositions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.launchpadProject.count(),
      prisma.launchpadProject.count({ where: { status: "active" } }),
      prisma.marginPosition.findMany({ where: { status: "open" } }),
      prisma.liquidationLog.count(),
      prisma.marginPosition.findMany({
        orderBy: { openedAt: "desc" },
        take: 10,
        include: {
          user: { select: { walletAddress: true } },
          project: { select: { tokenSymbol: true, tokenName: true } },
        },
      }),
    ]);

    // Aggregates
    const totalExposure = openPositions.reduce(
      (sum, p) => sum + Number(p.debtAmount),
      0
    );
    const totalModal = openPositions.reduce(
      (sum, p) => sum + Number(p.modal),
      0
    );
    const totalFeeCollected = openPositions.reduce(
      (sum, p) => sum + Number(p.feeAmount),
      0
    );

    // Revenue estimates
    const marginFeeRevenue = totalFeeCollected;
    const platformFeeFromGraduation = 0; // TODO: track actual graduation fees

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalProjects,
          activeProjects,
          openPositions: openPositions.length,
          totalLiquidations,
        },
        financials: {
          totalExposure,
          totalModal,
          marginFeeRevenue,
          platformFeeFromGraduation,
          estimatedInsuranceFund: totalExposure * 0.01,
        },
        recentPositions,
      },
    });
  } catch (error) {
    console.error("Error fetching admin dashboard:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
