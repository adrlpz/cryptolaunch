import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/projects/[id]/whitelist
 *
 * Ambil daftar whitelist untuk project.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const whitelist = await prisma.whitelist.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: {
        count: whitelist.length,
        entries: whitelist,
      },
    });
  } catch (error) {
    console.error("Error fetching whitelist:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/whitelist
 *
 * Tambah wallet ke whitelist.
 *
 * Body:
 *   - walletAddress: string
 *   - maxAllocation?: number (max token yang bisa dibeli)
 *   - addedBy?: string (wallet admin)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { walletAddress, maxAllocation, addedBy } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: "Missing walletAddress" },
        { status: 400 }
      );
    }

    // Check project exists
    const project = await prisma.launchpadProject.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    // Check if already whitelisted
    const existing = await prisma.whitelist.findUnique({
      where: {
        projectId_walletAddress: {
          projectId: id,
          walletAddress: walletAddress.toLowerCase(),
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Already whitelisted" },
        { status: 409 }
      );
    }

    const entry = await prisma.whitelist.create({
      data: {
        projectId: id,
        walletAddress: walletAddress.toLowerCase(),
        maxAllocation: maxAllocation ? Number(maxAllocation) : null,
        addedBy: addedBy || null,
      },
    });

    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  } catch (error) {
    console.error("Error adding to whitelist:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]/whitelist
 *
 * Hapus wallet dari whitelist.
 *
 * Body:
 *   - walletAddress: string
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: "Missing walletAddress" },
        { status: 400 }
      );
    }

    await prisma.whitelist.delete({
      where: {
        projectId_walletAddress: {
          projectId: id,
          walletAddress: walletAddress.toLowerCase(),
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing from whitelist:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
