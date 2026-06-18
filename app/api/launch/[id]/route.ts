import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/launch/[id]
 *
 * Ambil detail token launch.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const launch = await prisma.tokenLaunch.findUnique({
      where: { id },
      include: {
        vanityJobs: true,
        project: true,
      },
    });

    if (!launch) {
      return NextResponse.json(
        { success: false, error: "Launch not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: launch });
  } catch (error) {
    console.error("Error fetching launch:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
