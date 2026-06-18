import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/users
 *
 * List semua user dengan stats.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        include: {
          _count: {
            select: {
              marginPositions: true,
              tokenLaunches: true,
              liquidationLogs: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.user.count(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        users,
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("Error fetching admin users:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
