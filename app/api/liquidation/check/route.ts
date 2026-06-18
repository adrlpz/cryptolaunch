import { NextRequest, NextResponse } from "next/server";
import { checkAndLiquidate, getLiquidationWarnings } from "@/lib/liquidation";

/**
 * POST /api/liquidation/check
 *
 * Jalankan pengecekan likuidasi untuk semua posisi open.
 * Bisa dipanggil oleh cron job atau manual trigger.
 *
 * Body (optional):
 *   - dryRun: boolean (jika true, hanya cek tanpa proses likuidasi)
 *   - warningThreshold: number (default 20%)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const dryRun = body.dryRun === true;
    const warningThreshold = body.warningThreshold || 20;

    if (dryRun) {
      // Dry run: hanya cek posisi yang mendekati likuidasi
      const warnings = await getLiquidationWarnings(warningThreshold);
      return NextResponse.json({
        success: true,
        data: {
          mode: "dry_run",
          warnings,
          count: warnings.length,
        },
      });
    }

    // Real run: proses likuidasi
    const result = await checkAndLiquidate();

    return NextResponse.json({
      success: true,
      data: {
        mode: "execute",
        ...result,
      },
    });
  } catch (error) {
    console.error("Error in liquidation check:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/liquidation/check
 *
 * Ambil status ringkas: berapa posisi yang perlu di-liquidasi.
 */
export async function GET() {
  try {
    const warnings = await getLiquidationWarnings(20);

    return NextResponse.json({
      success: true,
      data: {
        warningsCount: warnings.length,
        warnings: warnings.slice(0, 10), // top 10 paling dekat likuidasi
      },
    });
  } catch (error) {
    console.error("Error fetching liquidation status:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
