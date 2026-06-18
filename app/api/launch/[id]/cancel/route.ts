import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/launch/[id]/cancel
 *
 * Batalkan token launch (hanya jika belum deployed).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { walletAddress } = body;

    const launch = await prisma.tokenLaunch.findUnique({
      where: { id },
    });

    if (!launch) {
      return NextResponse.json(
        { success: false, error: "Launch not found" },
        { status: 404 }
      );
    }

    if (launch.status === "deployed" || launch.status === "active") {
      return NextResponse.json(
        { success: false, error: "Cannot cancel a deployed launch" },
        { status: 400 }
      );
    }

    // Verify ownership (optional — admin can also cancel)
    if (walletAddress) {
      const user = await prisma.user.findUnique({
        where: { walletAddress: walletAddress.toLowerCase() },
      });

      if (!user || user.id !== launch.creatorId) {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 403 }
        );
      }
    }

    // Cancel vanity job if running
    await prisma.vanityJob.updateMany({
      where: {
        launchId: id,
        status: "running",
      },
      data: {
        status: "cancelled",
        completedAt: new Date(),
      },
    });

    // Update launch status
    await prisma.tokenLaunch.update({
      where: { id },
      data: { status: "cancelled" },
    });

    return NextResponse.json({
      success: true,
      data: { message: "Launch cancelled" },
    });
  } catch (error) {
    console.error("Error cancelling launch:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
