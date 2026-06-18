import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/projects/create
 *
 * Buat launchpad project baru (admin atau creator).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tokenName,
      tokenSymbol,
      contractAddress,
      tokenPrice,
      totalSupply,
      chain,
      maxLeveragePercent = 50,
      launchDate,
      whitelistEnabled = false,
    } = body;

    // Validation
    if (!tokenName || !tokenSymbol || !tokenPrice || !totalSupply || !chain || !launchDate) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (Number(tokenPrice) <= 0 || Number(totalSupply) <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid price or supply" },
        { status: 400 }
      );
    }

    const project = await prisma.launchpadProject.create({
      data: {
        tokenName,
        tokenSymbol: tokenSymbol.toUpperCase(),
        contractAddress: contractAddress || null,
        tokenPrice: Number(tokenPrice),
        totalSupply: Number(totalSupply),
        availableSupply: Number(totalSupply), // semua supply tersedia awalnya
        chain,
        maxLeveragePercent: Math.min(50, Math.max(10, maxLeveragePercent)),
        launchDate: new Date(launchDate),
        status: "upcoming",
      },
    });

    return NextResponse.json({ success: true, data: project }, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
