import { NextRequest, NextResponse } from "next/server";
import { handleMidtransNotification } from "@/lib/payments/midtrans";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
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
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
