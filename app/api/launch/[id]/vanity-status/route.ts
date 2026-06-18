import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/launch/[id]/vanity-status
 *
 * Status vanity address generation.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const launch = await prisma.tokenLaunch.findUnique({
      where: { id },
    });

    if (!launch) {
      return NextResponse.json(
        { success: false, error: "Launch not found" },
        { status: 404 }
      );
    }

    // Query for active vanity job (running), or most recent completed
    const vanityJob = await prisma.vanityJob.findFirst({
      where: {
        launchId: id,
        status: "running",
      },
      orderBy: { startedAt: "desc" },
    }) ?? await prisma.vanityJob.findFirst({
      where: { launchId: id },
      orderBy: { completedAt: "desc" },
    });

    if (!vanityJob) {
      return NextResponse.json(
        { success: false, error: "No vanity job found" },
        { status: 404 }
      );
    }

    // Calculate progress
    const maxAttempts = Number(vanityJob.maxAttempts);
    const attempts = Number(vanityJob.attempts);
    const progressPercent = Math.min(100, (attempts / maxAttempts) * 100);

    // Estimate time remaining (~50k attempts/sec for local CREATE2 compute)
    const attemptsPerSecond = 50_000;
    const remainingAttempts = maxAttempts - attempts;
    const estimatedSecondsRemaining =
      vanityJob.status === "running"
        ? Math.ceil(remainingAttempts / attemptsPerSecond)
        : 0;

    return NextResponse.json({
      success: true,
      data: {
        jobId: vanityJob.id,
        status: vanityJob.status,
        targetSuffix: vanityJob.targetSuffix,
        attempts,
        maxAttempts,
        progressPercent,
        estimatedSecondsRemaining,
        foundAddress: vanityJob.foundAddress,
        contractAddress: launch.contractAddress,
        startedAt: vanityJob.startedAt,
        completedAt: vanityJob.completedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching vanity status:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
