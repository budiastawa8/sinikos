import { createHash } from "crypto";
import { InvoiceStatus, type Organization } from "@prisma/client";
import { db } from "@/lib/db";
import { decryptSecret, normalizeEnvLike } from "@/lib/crypto/secrets";

type OrgMidtrans = Pick<
  Organization,
  | "midtransEnabled"
  | "midtransIsProduction"
  | "midtransServerKeyEnc"
  | "midtransClientKeyEnc"
>;

export function isOrgMidtransConfigured(org: OrgMidtrans) {
  return Boolean(org.midtransEnabled && org.midtransServerKeyEnc);
}

function getOrgServerKey(org: OrgMidtrans) {
  if (!org.midtransServerKeyEnc) return "";
  try {
    return normalizeEnvLike(decryptSecret(org.midtransServerKeyEnc));
  } catch {
    return "";
  }
}

function snapBaseUrl(isProduction: boolean) {
  return isProduction
    ? "https://app.midtrans.com"
    : "https://app.sandbox.midtrans.com";
}

function authHeader(serverKey: string) {
  const token = Buffer.from(`${serverKey}:`).toString("base64");
  return `Basic ${token}`;
}

function appBaseUrl() {
  return (
    process.env.AUTH_URL?.replace(/\/$/, "") ||
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

export function notificationUrlHint() {
  return `${appBaseUrl()}/api/payments/midtrans/notification`;
}

export type CreateSnapResult =
  | { ok: true; orderId: string; redirectUrl: string; token: string }
  | { ok: false; error: string };

export async function createSnapPayment(
  invoiceId: string,
): Promise<CreateSnapResult> {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      organization: true,
      lease: {
        include: {
          tenant: true,
          room: { include: { property: true } },
        },
      },
    },
  });

  if (!invoice) return { ok: false, error: "Tagihan tidak ditemukan" };

  const org = invoice.organization;
  if (!isOrgMidtransConfigured(org)) {
    return {
      ok: false,
      error:
        "Midtrans belum dikonfigurasi. Isi Server Key di Pengaturan → Midtrans.",
    };
  }

  const serverKey = getOrgServerKey(org);
  if (!serverKey) {
    return {
      ok: false,
      error:
        "Gagal membaca Server Key Midtrans. Simpan ulang key di Pengaturan.",
    };
  }

  if (invoice.status === InvoiceStatus.PAID) {
    return { ok: false, error: "Tagihan sudah lunas" };
  }

  const remaining = invoice.amount - invoice.amountPaid;
  if (remaining <= 0) return { ok: false, error: "Tidak ada sisa tagihan" };

  const orderId = `SK-${invoice.id}-${Date.now()}`;
  const finishUrl = `${appBaseUrl()}/bayar/selesai`;
  const mode = org.midtransIsProduction ? "production" : "sandbox";

  const body = {
    transaction_details: {
      order_id: orderId,
      gross_amount: remaining,
    },
    item_details: [
      {
        id: invoice.id,
        price: remaining,
        quantity: 1,
        name: `Sewa ${invoice.lease.room.property.name} ${invoice.lease.room.code}`.slice(
          0,
          50,
        ),
      },
    ],
    customer_details: {
      first_name: invoice.lease.tenant.name.slice(0, 50),
      phone: invoice.lease.tenant.phone,
      email: invoice.lease.tenant.email || undefined,
    },
    callbacks: {
      finish: finishUrl,
    },
  };

  try {
    const res = await fetch(
      `${snapBaseUrl(org.midtransIsProduction)}/snap/v1/transactions`,
      {
        method: "POST",
        headers: {
          Authorization: authHeader(serverKey),
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    const data = (await res.json()) as {
      token?: string;
      redirect_url?: string;
      error_messages?: string[];
      status_message?: string;
    };

    if (!res.ok || !data.token || !data.redirect_url) {
      const detail =
        data.error_messages?.join(", ") ||
        data.status_message ||
        "Unauthorized / key ditolak";
      return {
        ok: false,
        error: `Midtrans HTTP ${res.status} (${mode}): ${detail}. Periksa Server Key & mode di Pengaturan.`,
      };
    }

    await db.invoice.update({
      where: { id: invoice.id },
      data: {
        midtransOrderId: orderId,
        paymentUrl: data.redirect_url,
      },
    });

    return {
      ok: true,
      orderId,
      redirectUrl: data.redirect_url,
      token: data.token,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Gagal membuat link Midtrans",
    };
  }
}

export function verifyMidtransSignature(params: {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  signatureKey: string;
  serverKey: string;
}) {
  if (!params.serverKey) return false;
  const payload =
    params.orderId + params.statusCode + params.grossAmount + params.serverKey;
  const expected = createHash("sha512").update(payload).digest("hex");
  return expected === params.signatureKey;
}

/** Apply Midtrans notification to invoice/payment records (per-org key). */
export async function handleMidtransNotification(body: {
  order_id?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;
  transaction_status?: string;
  fraud_status?: string;
  transaction_id?: string;
  payment_type?: string;
}) {
  const orderId = body.order_id ?? "";
  const statusCode = body.status_code ?? "";
  const grossAmount = body.gross_amount ?? "";
  const signatureKey = body.signature_key ?? "";

  const invoice = await db.invoice.findFirst({
    where: { midtransOrderId: orderId },
    include: { organization: true },
  });

  // Midtrans "Test notification URL" mengirim order_id yang tidak ada di DB.
  // Tetap 200 agar tes URL lulus; notifikasi sungguhan tetap diproses di bawah.
  if (!invoice) {
    return {
      ok: true as const,
      ignored: true as const,
      reason: "unknown_order",
    };
  }

  const serverKey = getOrgServerKey(invoice.organization);
  if (
    !verifyMidtransSignature({
      orderId,
      statusCode,
      grossAmount,
      signatureKey,
      serverKey,
    })
  ) {
    return { ok: false as const, error: "Signature tidak valid" };
  }

  const status = body.transaction_status;
  const fraud = body.fraud_status;
  const paidStatuses =
    status === "capture" || status === "settlement"
      ? fraud !== "challenge"
      : false;

  if (!paidStatuses) {
    return { ok: true as const, skipped: true as const, status };
  }

  if (invoice.status === InvoiceStatus.PAID) {
    return { ok: true as const, alreadyPaid: true as const };
  }

  const amount = Math.round(Number(grossAmount));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false as const, error: "Nominal tidak valid" };
  }

  const amountPaid = Math.min(invoice.amount, invoice.amountPaid + amount);
  const method = `MIDTRANS:${body.payment_type ?? "online"}`;

  await db.$transaction([
    db.payment.create({
      data: {
        invoiceId: invoice.id,
        amount,
        method,
        notes: `Midtrans ${status}`,
        providerRef: body.transaction_id ?? orderId,
      },
    }),
    db.invoice.update({
      where: { id: invoice.id },
      data: {
        amountPaid,
        status:
          amountPaid >= invoice.amount
            ? InvoiceStatus.PAID
            : InvoiceStatus.PARTIAL,
      },
    }),
  ]);

  return { ok: true as const, paid: true as const, invoiceId: invoice.id };
}
