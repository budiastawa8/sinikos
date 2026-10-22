import { createHash } from "crypto";
import { InvoiceStatus, type Organization } from "@prisma/client";
import { db } from "@/lib/db";
import { isProActive } from "@/lib/billing/plans";
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

export function snapBaseUrl(isProduction: boolean) {
  return isProduction
    ? "https://app.midtrans.com"
    : "https://app.sandbox.midtrans.com";
}

export function apiBaseUrl(isProduction: boolean) {
  return isProduction
    ? "https://api.midtrans.com"
    : "https://api.sandbox.midtrans.com";
}

export function authHeader(serverKey: string) {
  const token = Buffer.from(`${serverKey}:`).toString("base64");
  return `Basic ${token}`;
}

export function isPaidTransactionStatus(
  status?: string,
  fraud?: string,
) {
  if (status === "settlement") return true;
  if (status === "capture" && fraud !== "challenge") return true;
  return false;
}

async function findInvoiceByOrderId(orderId: string) {
  const byOrder = await db.invoice.findFirst({
    where: { midtransOrderId: orderId },
    include: { organization: true },
  });
  if (byOrder) return byOrder;

  // Fallback: order_id format SK-{invoiceId}-{timestamp}
  const match = orderId.match(/^SK-(.+)-(\d+)$/);
  if (!match) return null;

  return db.invoice.findFirst({
    where: { id: match[1] },
    include: { organization: true },
  });
}

async function markInvoicePaidFromMidtrans(params: {
  invoiceId: string;
  amount: number;
  invoiceAmount: number;
  amountPaid: number;
  status: string;
  paymentType?: string;
  providerRef?: string;
  orderId: string;
}) {
  const amountPaid = Math.min(
    params.invoiceAmount,
    params.amountPaid + params.amount,
  );
  const method = `MIDTRANS:${params.paymentType ?? "online"}`;

  await db.$transaction([
    db.payment.create({
      data: {
        invoiceId: params.invoiceId,
        amount: params.amount,
        method,
        notes: `Midtrans ${params.status}`,
        providerRef: params.providerRef ?? params.orderId,
      },
    }),
    db.invoice.update({
      where: { id: params.invoiceId },
      data: {
        amountPaid,
        status:
          amountPaid >= params.invoiceAmount
            ? InvoiceStatus.PAID
            : InvoiceStatus.PARTIAL,
        midtransOrderId: params.orderId,
      },
    }),
  ]);
}

export function appBaseUrl() {
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
  if (!isProActive(org)) {
    return {
      ok: false,
      error:
        "Link bayar sewa tersedia di paket Pro. Buka menu Langganan untuk upgrade.",
    };
  }

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
    const notifyUrl = notificationUrlHint();
    const res = await fetch(
      `${snapBaseUrl(org.midtransIsProduction)}/snap/v1/transactions`,
      {
        method: "POST",
        headers: {
          Authorization: authHeader(serverKey),
          "Content-Type": "application/json",
          Accept: "application/json",
          // Pastikan notifikasi juga dikirim ke SiniKos meski setting dashboard beda
          "X-Append-Notification": notifyUrl,
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

  const invoice = await findInvoiceByOrderId(orderId);

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
    console.error("[midtrans] signature mismatch", {
      orderId,
      invoiceId: invoice.id,
    });
    return { ok: false as const, error: "Signature tidak valid" };
  }

  const status = body.transaction_status;
  const fraud = body.fraud_status;

  if (!isPaidTransactionStatus(status, fraud)) {
    return { ok: true as const, skipped: true as const, status };
  }

  if (invoice.status === InvoiceStatus.PAID) {
    return { ok: true as const, alreadyPaid: true as const };
  }

  const amount = Math.round(Number(grossAmount));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false as const, error: "Nominal tidak valid" };
  }

  await markInvoicePaidFromMidtrans({
    invoiceId: invoice.id,
    amount,
    invoiceAmount: invoice.amount,
    amountPaid: invoice.amountPaid,
    status: status ?? "settlement",
    paymentType: body.payment_type,
    providerRef: body.transaction_id,
    orderId,
  });

  return { ok: true as const, paid: true as const, invoiceId: invoice.id };
}

/** Poll Midtrans status API (berguna jika webhook belum sampai). */
export async function syncInvoicePaymentStatus(invoiceId: string) {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { organization: true },
  });
  if (!invoice) {
    return { ok: false as const, error: "Tagihan tidak ditemukan" };
  }
  if (!isOrgMidtransConfigured(invoice.organization)) {
    return { ok: false as const, error: "Midtrans belum dikonfigurasi" };
  }
  if (!invoice.midtransOrderId) {
    return {
      ok: false as const,
      error: "Belum ada order Midtrans. Buat link bayar dulu.",
    };
  }
  if (invoice.status === InvoiceStatus.PAID) {
    return { ok: true as const, alreadyPaid: true as const };
  }

  const serverKey = getOrgServerKey(invoice.organization);
  if (!serverKey) {
    return { ok: false as const, error: "Server Key tidak bisa dibaca" };
  }

  const orderId = invoice.midtransOrderId;
  const url = `${apiBaseUrl(invoice.organization.midtransIsProduction)}/v2/${encodeURIComponent(orderId)}/status`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: authHeader(serverKey),
        Accept: "application/json",
      },
      cache: "no-store",
    });
    const data = (await res.json()) as {
      status_code?: string;
      status_message?: string;
      transaction_status?: string;
      fraud_status?: string;
      gross_amount?: string;
      payment_type?: string;
      transaction_id?: string;
      order_id?: string;
    };

    if (!res.ok) {
      return {
        ok: false as const,
        error:
          data.status_message ||
          `Gagal cek status Midtrans (HTTP ${res.status})`,
      };
    }

    const status = data.transaction_status;
    if (!isPaidTransactionStatus(status, data.fraud_status)) {
      return {
        ok: true as const,
        pending: true as const,
        status: status ?? "unknown",
        message: `Status Midtrans: ${status ?? "belum lunas"}. Selesaikan pembayaran uji di Sandbox, lalu cek lagi.`,
      };
    }

    const amount = Math.round(Number(data.gross_amount ?? 0));
    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false as const, error: "Nominal dari Midtrans tidak valid" };
    }

    await markInvoicePaidFromMidtrans({
      invoiceId: invoice.id,
      amount,
      invoiceAmount: invoice.amount,
      amountPaid: invoice.amountPaid,
      status: status ?? "settlement",
      paymentType: data.payment_type,
      providerRef: data.transaction_id,
      orderId: data.order_id ?? orderId,
    });

    return { ok: true as const, paid: true as const };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Gagal menghubungi Midtrans",
    };
  }
}
