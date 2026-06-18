import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/launch/my?walletAddress=0x...
 *
 * List token yang user launch.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: "Missing walletAddress parameter" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const launches = await prisma.tokenLaunch.findMany({
      where: { creatorId: user.id },
      include: {
        vanityJobs: {
          select: {
            id: true,
            status: true,
            attempts: true,
            maxAttempts: true,
          },
        },
        project: {
          select: {
            id: true,
            status: true,
            tokenPrice: true,
            availableSupply: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: launches });
  } catch (error) {
    console.error("Error fetching launches:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
