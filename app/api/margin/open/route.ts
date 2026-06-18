import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateMargin } from "@/lib/margin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, projectId, modal, leveragePercent } = body;

    // Validation
    if (!walletAddress || !projectId || !modal || !leveragePercent) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Get project
    const project = await prisma.launchpadProject.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    if (project.status !== "active") {
      return NextResponse.json(
        { success: false, error: "Project is not active" },
        { status: 400 }
      );
    }

    // Calculate margin
    const modalNum = Number(modal);
    const levNum = Number(leveragePercent);
    const tokenPrice = Number(project.tokenPrice);

    if (levNum > project.maxLeveragePercent) {
      return NextResponse.json(
        { success: false, error: `Max leverage for this project is ${project.maxLeveragePercent}%` },
        { status: 400 }
      );
    }

    const calc = calculateMargin(modalNum, levNum, tokenPrice);

    // Check if user has enough balance
    if (Number(user.balance) < modalNum) {
      return NextResponse.json(
        { success: false, error: "Insufficient balance" },
        { status: 400 }
      );
    }

    // Check if project has enough supply
    if (Number(project.availableSupply) < calc.coinsPurchased) {
      return NextResponse.json(
        { success: false, error: "Not enough tokens available" },
        { status: 400 }
      );
    }

    // Create position & update user balance & project supply
    const position = await prisma.$transaction(async (tx) => {
      // Deduct from user balance
      await tx.user.update({
        where: { id: user.id },
        data: {
          balance: { decrement: modalNum },
          totalMarginDebt: { increment: calc.debtAmount },
        },
      });

      // Decrease available supply
      await tx.launchpadProject.update({
        where: { id: project.id },
        data: {
          availableSupply: { decrement: calc.coinsPurchased },
        },
      });

      // Create position
      return tx.marginPosition.create({
        data: {
          userId: user.id,
          projectId: project.id,
          modal: modalNum,
          leveragePercent: levNum,
          debtAmount: calc.debtAmount,
          feeAmount: calc.feeAmount,
          totalCost: calc.totalFunds,
          coinsPurchased: calc.coinsPurchased,
          purchasePrice: calc.purchasePrice,
          liquidationPrice: calc.liquidationPrice,
          safetyMargin: calc.safetyMargin,
          status: "open",
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        positionId: position.id,
        ...calc,
      },
    });
  } catch (error) {
    console.error("Error opening position:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
