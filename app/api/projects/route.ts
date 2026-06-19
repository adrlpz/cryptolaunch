import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const projects = await prisma.launchpadProject.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        liquidityPool: {
          select: {
            poolAddress: true,
            isGraduated: true,
            totalSold: true,
            totalRaised: true,
            graduationCap: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: projects });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
