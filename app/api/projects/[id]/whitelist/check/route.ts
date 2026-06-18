import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/projects/[id]/whitelist/check?walletAddress=0x...
 *
 * Cek apakah wallet tertentu ada di whitelist.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: "Missing walletAddress parameter" },
        { status: 400 }
      );
    }

    const entry = await prisma.whitelist.findUnique({
      where: {
        projectId_walletAddress: {
          projectId: id,
          walletAddress: walletAddress.toLowerCase(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        isWhitelisted: !!entry,
        maxAllocation: entry?.maxAllocation || null,
      },
    });
  } catch (error) {
    console.error("Error checking whitelist:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
