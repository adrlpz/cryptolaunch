import { NextRequest, NextResponse } from "next/server";
import { checkAndLiquidate } from "@/lib/liquidation";

/**
 * POST /api/cron/liquidation
 *
 * Cron endpoint untuk auto-liquidation check.
 * Dipanggil oleh external cron service (Vercel Cron, GitHub Actions, dll)
 * atau oleh internal scheduler.
 *
 * Security: validasi cron secret untuk mencegah unauthorized access.
 */
export async function POST(request: NextRequest) {
  try {
    // Validasi cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Jalankan liquidation check
    const result = await checkAndLiquidate();

    // Log hasil
    console.log(
      `[Liquidation Cron] Checked: ${result.checked}, Liquidated: ${result.liquidated}, Errors: ${result.errors.length}`
    );

    if (result.errors.length > 0) {
      console.warn("[Liquidation Cron] Errors:", result.errors);
    }

    return NextResponse.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        ...result,
      },
    });
  } catch (error) {
    console.error("[Liquidation Cron] Fatal error:", error);
    return NextResponse.json(
      { success: false, error: "Cron execution failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/liquidation
 *
 * Health check untuk cron endpoint.
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      endpoint: "/api/cron/liquidation",
      method: "POST",
      description: "Auto-liquidation cron job",
      schedule: "Every 5 seconds (configurable)",
    },
  });
}
