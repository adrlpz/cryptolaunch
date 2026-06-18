import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/projects
 *
 * List semua project dengan stats lengkap.
 */
export async function GET() {
  try {
    const projects = await prisma.launchpadProject.findMany({
      include: {
        liquidityPool: true,
        _count: {
          select: { marginPositions: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const projectsWithStats = projects.map((p) => {
      const soldPercent =
        Number(p.totalSupply) > 0
          ? ((Number(p.totalSupply) - Number(p.availableSupply)) /
              Number(p.totalSupply)) *
            100
          : 0;

      return {
        ...p,
        soldPercent,
        positionCount: p._count.marginPositions,
      };
    });

    return NextResponse.json({
      success: true,
      data: projectsWithStats,
    });
  } catch (error) {
    console.error("Error fetching admin projects:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
