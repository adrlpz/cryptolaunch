import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/liquidation/history
 *
 * Ambil riwayat likuidasi untuk user tertentu atau semua.
 *
 * Query params:
 *   - walletAddress: string (optional — filter by user)
 *   - limit: number (default 50)
 *   - offset: number (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (walletAddress) {
      const user = await prisma.user.findUnique({
        where: { walletAddress: walletAddress.toLowerCase() },
      });

      if (!user) {
        return NextResponse.json({
          success: true,
          data: { logs: [], total: 0 },
        });
      }

      where.userId = user.id;
    }

    const [logs, total] = await Promise.all([
      prisma.liquidationLog.findMany({
        where,
        include: {
          user: {
            select: { walletAddress: true },
          },
          position: {
            include: {
              project: {
                select: {
                  tokenName: true,
                  tokenSymbol: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.liquidationLog.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        logs,
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("Error fetching liquidation history:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
