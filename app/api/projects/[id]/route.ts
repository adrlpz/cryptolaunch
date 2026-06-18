import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const project = await prisma.launchpadProject.findUnique({
      where: { id },
      include: {
        liquidityPool: true,
        launch: {
          select: {
            id: true,
            contractAddress: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    // bondingCurveAddress not stored directly — pool address is the curve
    const data = {
      ...project,
      bondingCurveAddress: project.liquidityPool?.poolAddress ?? null,
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
