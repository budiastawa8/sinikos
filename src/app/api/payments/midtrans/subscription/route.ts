import { NextRequest, NextResponse } from "next/server";
import { handleSubscriptionNotification } from "@/lib/payments/platform-midtrans";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "sinikos-midtrans-subscription",
  });
}

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: "empty_body",
      });
    }

    const result = await handleSubscriptionNotification({
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
      const status = result.error === "Signature tidak valid" ? 403 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error("[midtrans/subscription]", e);
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "internal_error",
      },
      { status: 500 },
    );
  }
}
