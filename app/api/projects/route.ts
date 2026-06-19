import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();
    const projects = await prisma.launchpadProject.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        liquidityPool: {
          select: {
            poolAddress: true,
            isGraduated: true,
            totalSold: true,
            totalRaised: true,
            graduationCap: true,
          },
        },
      },
    });

    // Auto-update statuses based on launchDate and graduation
    for (const project of projects) {
      if (project.status === "upcoming" && new Date(project.launchDate) <= now) {
        await prisma.launchpadProject.update({
          where: { id: project.id },
          data: { status: "active" },
        });
        project.status = "active";
      }
      if (project.liquidityPool?.isGraduated && project.status !== "graduated") {
        await prisma.launchpadProject.update({
          where: { id: project.id },
          data: { status: "graduated" },
        });
        project.status = "graduated";
      }
    }

    return NextResponse.json({ success: true, data: projects });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
