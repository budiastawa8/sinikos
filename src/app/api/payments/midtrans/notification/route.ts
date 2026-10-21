import { NextRequest, NextResponse } from "next/server";
import { handleMidtransNotification } from "@/lib/payments/midtrans";

export async function GET() {
  // Health check untuk memastikan route reachable
  return NextResponse.json({
    ok: true,
    service: "sinikos-midtrans-notification",
  });
}

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      // Beberapa tes Midtrans mungkin body kosong / non-JSON
      return NextResponse.json({ ok: true, ignored: true, reason: "empty_body" });
    }

    const result = await handleMidtransNotification({
      order_id: String(body.order_id ?? ""),
      status_code: String(body.status_code ?? ""),
      gross_amount: String(body.gross_amount ?? ""),
      signature_key: String(body.signature_key ?? ""),
      transaction_status: String(body.transaction_status ?? ""),
      fraud_status: body.fraud_status ? String(body.fraud_status) : undefined,
      transaction_id: body.transaction_id
        ? String(body.transaction_id)
        : undefined,
      payment_type: body.payment_type ? String(body.payment_type) : undefined,
    });

    if (!result.ok) {
      // Signature invalid untuk order yang dikenal → 403
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error("[midtrans/notification]", e);
    // Jangan 500 ke Midtrans bila memungkinkan — log saja
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "internal_error",
      },
      { status: 500 },
    );
  }
}
