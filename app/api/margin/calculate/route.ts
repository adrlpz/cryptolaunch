import { NextRequest, NextResponse } from "next/server";
import { calculateMargin } from "@/lib/margin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { modal, leveragePercent, tokenPrice } = body;

    // Validation
    if (!modal || !leveragePercent || !tokenPrice) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: modal, leveragePercent, tokenPrice" },
        { status: 400 }
      );
    }

    if (modal <= 0 || leveragePercent <= 0 || leveragePercent > 50 || tokenPrice <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid values" },
        { status: 400 }
      );
    }

    const result = calculateMargin(Number(modal), Number(leveragePercent), Number(tokenPrice));

    return NextResponse.json({ success: true, data: result });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
