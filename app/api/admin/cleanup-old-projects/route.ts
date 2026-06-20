import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/cleanup-old-projects
 * One-time cleanup: delete all projects from old factory.
 * Only callable with correct secret.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    // Get all projects
    const projects = await prisma.launchpadProject.findMany({
      include: { liquidityPool: true, launch: true },
    });

    const results = [];

    for (const project of projects) {
      // Delete liquidity pool first
      if (project.liquidityPool) {
        await prisma.liquidityPool.delete({ where: { id: project.liquidityPool.id } });
      }

      // Delete related token launch + vanity jobs
      if (project.launch) {
        await prisma.vanityJob.deleteMany({ where: { launchId: project.launch.id } });
        await prisma.tokenLaunch.delete({ where: { id: project.launch.id } });
      }

      // Delete project
      await prisma.launchpadProject.delete({ where: { id: project.id } });
      results.push({ id: project.id.slice(0, 8), name: project.tokenName, deleted: true });
    }

    return NextResponse.json({
      success: true,
      deleted: results.length,
      projects: results,
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
