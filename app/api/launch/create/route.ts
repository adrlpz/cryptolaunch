import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/launch/create
 *
 * DEPRECATED — use POST /api/launch/precompute instead.
 *
 * Old flow: generated deployer wallet + CREATE (insecure)
 * New flow: CREATE2 via factory.createLaunch() with vanity salt (secure)
 *
 * This endpoint now returns a redirect instruction.
 */
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: "This endpoint is deprecated. Use POST /api/launch/precompute instead.",
      redirectTo: "/api/launch/precompute",
    },
    { status: 410 } // Gone
  );
}
