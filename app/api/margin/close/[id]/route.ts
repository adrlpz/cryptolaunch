import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { currentPrice, walletAddress } = body;

    if (!currentPrice || !walletAddress) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: currentPrice, walletAddress" },
        { status: 400 }
      );
    }

    // Get position
    const position = await prisma.marginPosition.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!position) {
      return NextResponse.json(
        { success: false, error: "Position not found" },
        { status: 404 }
      );
    }

    if (position.user.walletAddress !== walletAddress.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    if (position.status !== "open") {
      return NextResponse.json(
        { success: false, error: "Position is not open" },
        { status: 400 }
      );
    }

    // Calculate PnL
    const currentValue = Number(position.coinsPurchased) * Number(currentPrice);
    const equity = currentValue - Number(position.debtAmount);
    const pnl = equity - Number(position.modal);

    // Close position & update user balance
    const result = await prisma.$transaction(async (tx) => {
      // Update position
      const closed = await tx.marginPosition.update({
        where: { id },
        data: {
          status: "closed",
          pnl: pnl,
          closedAt: new Date(),
        },
      });

      // Return equity to user balance
      await tx.user.update({
        where: { id: position.userId },
        data: {
          balance: { increment: equity },
          totalMarginDebt: { decrement: Number(position.debtAmount) },
        },
      });

      // Return coins to available supply
      await tx.launchpadProject.update({
        where: { id: position.projectId },
        data: {
          availableSupply: { increment: position.coinsPurchased },
        },
      });

      return closed;
    });

    return NextResponse.json({
      success: true,
      data: {
        positionId: result.id,
        pnl,
        equity,
        currentValue,
      },
    });
  } catch (error) {
    console.error("Error closing position:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
