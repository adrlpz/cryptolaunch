import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";

/**
 * POST /api/admin/verify
 *
 * Verify if a wallet address has admin access.
 * Body: { walletAddress: string }
 */
export async function POST(request: Request) {
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress || typeof walletAddress !== "string") {
      return NextResponse.json(
        { success: false, error: "walletAddress required" },
        { status: 400 }
      );
    }

    const admin = isAdmin(walletAddress);

    return NextResponse.json({ success: true, data: { isAdmin: admin } });
  } catch (err) {
    console.error("Admin verify error:", err);
    return NextResponse.json(
      { success: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}
