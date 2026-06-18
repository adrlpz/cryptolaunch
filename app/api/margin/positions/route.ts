import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const positions = await prisma.marginPosition.findMany({
      where: { userId: user.id },
      include: {
        project: {
          select: {
            tokenName: true,
            tokenSymbol: true,
            tokenPrice: true,
            contractAddress: true,
          },
        },
      },
      orderBy: { openedAt: "desc" },
    });

    return NextResponse.json({ success: true, data: positions });
  } catch (error) {
    console.error("Error fetching positions:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
