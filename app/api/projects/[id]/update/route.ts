import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * PUT /api/projects/[id]/update
 *
 * Update launchpad project.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check project exists
    const existing = await prisma.launchpadProject.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    // Build update data (only allowed fields)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    if (body.tokenPrice !== undefined) updateData.tokenPrice = Number(body.tokenPrice);
    if (body.status !== undefined) {
      const allowedStatuses = ["upcoming", "active", "ended"];
      if (!allowedStatuses.includes(body.status)) {
        return NextResponse.json(
          { success: false, error: `Invalid status. Allowed: ${allowedStatuses.join(", ")}` },
          { status: 400 }
        );
      }
      updateData.status = body.status;
    }
    if (body.maxLeveragePercent !== undefined) {
      updateData.maxLeveragePercent = Math.min(50, Math.max(10, body.maxLeveragePercent));
    }
    if (body.endDate !== undefined) updateData.endDate = new Date(body.endDate);
    if (body.contractAddress !== undefined) updateData.contractAddress = body.contractAddress;

    const project = await prisma.launchpadProject.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: project });
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
