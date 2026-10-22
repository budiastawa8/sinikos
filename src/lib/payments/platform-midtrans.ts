import { addMonths } from "date-fns";
import type { BillingPeriod, Subscription } from "@prisma/client";
import { db } from "@/lib/db";
import { normalizeEnvLike } from "@/lib/crypto/secrets";
import { periodMonths, priceForPeriod } from "@/lib/billing/plans";
import {
  apiBaseUrl,
  appBaseUrl,
  authHeader,
  isPaidTransactionStatus,
  snapBaseUrl,
  verifyMidtransSignature,
} from "@/lib/payments/midtrans";

type PlatformConfig =
  | { ok: true; serverKey: string; isProduction: boolean }
  | { ok: false; error: string };

export type PlatformMidtransStatus = {
  configured: boolean;
  isProduction: boolean;
  message: string | null;
};

function productionFlag() {
  const raw = (process.env.PLATFORM_MIDTRANS_IS_PRODUCTION ?? "")
    .trim()
    .toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export function getPlatformMidtransConfig(): PlatformConfig {
  const serverKey = normalizeEnvLike(
    process.env.PLATFORM_MIDTRANS_SERVER_KEY ?? "",
  );
  const isProduction = productionFlag();

  if (!serverKey) {
    return {
      ok: false,
      error:
        "Pembayaran langganan belum diaktifkan. Isi PLATFORM_MIDTRANS_SERVER_KEY (Sandbox dulu) di environment.",
    };
  }

  const sandboxKey = serverKey.startsWith("SB-Mid-server-");
  const productionKey = serverKey.startsWith("Mid-server-");
  if (!sandboxKey && !productionKey) {
    return {
      ok: false,
      error:
        "PLATFORM_MIDTRANS_SERVER_KEY tidak valid. Harus diawali Mid-server- atau SB-Mid-server-.",
    };
  }

  if (isProduction && sandboxKey) {
    return {
      ok: false,
      error:
        "Mode Production aktif, tetapi key masih Sandbox (SB-). Samakan mode dan key sebelum menerima uang sungguhan.",
    };
  }

  if (!isProduction && productionKey && !sandboxKey) {
    return {
      ok: false,
      error:
        "Key terlihat Production, tetapi PLATFORM_MIDTRANS_IS_PRODUCTION belum true. Jangan campur mode Sandbox dengan key Production.",
    };
  }

  return { ok: true, serverKey, isProduction };
}

export function getPlatformMidtransStatus(): PlatformMidtransStatus {
  const config = getPlatformMidtransConfig();
  if (!config.ok) {
    const missing = !normalizeEnvLike(
      process.env.PLATFORM_MIDTRANS_SERVER_KEY ?? "",
    );
    return {
      configured: false,
      isProduction: productionFlag(),
      message: missing ? null : config.error,
    };
  }
  return {
    configured: true,
    isProduction: config.isProduction,
    message: null,
  };
}

export function subscriptionNotifyUrl() {
  return `${appBaseUrl()}/api/payments/midtrans/subscription`;
}

type NotifyBody = {
  order_id?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;
  transaction_status?: string;
  fraud_status?: string;
  transaction_id?: string;
  payment_type?: string;
};

async function findSubscriptionByOrderId(orderId: string) {
  const byOrder = await db.subscription.findUnique({
    where: { midtransOrderId: orderId },
  });
  if (byOrder) return byOrder;

  const match = orderId.match(/^SUB-(.+)-\d+$/);
  if (!match) return null;
  return db.subscription.findUnique({ where: { id: match[1] } });
}

async function activatePaidSubscription(
  sub: Subscription,
  params: {
    orderId: string;
    amount: number;
    providerRef?: string;
  },
) {
  if (params.amount !== sub.amount) {
    console.error("[midtrans/subscription] amount mismatch", {
      orderId: params.orderId,
      expected: sub.amount,
      got: params.amount,
    });
    return {
      ok: false as const,
      error: "Nominal tidak sesuai tagihan langganan",
    };
  }

  const org = await db.organization.findUnique({
    where: { id: sub.organizationId },
  });
  if (!org) {
    return { ok: false as const, error: "Organisasi tidak ditemukan" };
  }

  const now = new Date();
  const base =
    org.plan === "PRO" && org.planExpiresAt && org.planExpiresAt > now
      ? org.planExpiresAt
      : now;
  const endsAt = addMonths(base, periodMonths(sub.period));

  const updated = await db.subscription.updateMany({
    where: { id: sub.id, status: "PENDING" },
    data: {
      status: "ACTIVE",
      paidAt: now,
      startsAt: base,
      endsAt,
      providerRef: params.providerRef,
      midtransOrderId: params.orderId,
    },
  });

  if (updated.count === 0) {
    const current = await db.subscription.findUnique({ where: { id: sub.id } });
    if (current?.status === "ACTIVE" && current.endsAt) {
      if (!org.planExpiresAt || org.planExpiresAt < current.endsAt) {
        await db.organization.update({
          where: { id: org.id },
          data: { plan: "PRO", planExpiresAt: current.endsAt },
        });
      }
      return {
        ok: true as const,
        alreadyPaid: true as const,
        endsAt: current.endsAt,
      };
    }
    return { ok: true as const, skipped: true as const };
  }

  await db.organization.update({
    where: { id: org.id },
    data: { plan: "PRO", planExpiresAt: endsAt },
  });

  return { ok: true as const, paid: true as const, endsAt };
}

export async function createSubscriptionPayment(params: {
  organizationId: string;
  period: BillingPeriod;
  customerName: string;
  customerEmail?: string;
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const config = getPlatformMidtransConfig();
  if (!config.ok) return config;

  const amount = priceForPeriod(params.period);
  const recent = await db.subscription.findFirst({
    where: {
      organizationId: params.organizationId,
      status: "PENDING",
      period: params.period,
      amount,
      paymentUrl: { not: null },
      createdAt: { gt: new Date(Date.now() - 12 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: "desc" },
  });
  if (recent?.paymentUrl) {
    return { ok: true, url: recent.paymentUrl };
  }

  const subscription = await db.subscription.create({
    data: {
      organizationId: params.organizationId,
      plan: "PRO",
      period: params.period,
      status: "PENDING",
      amount,
    },
  });

  const orderId = `SUB-${subscription.id}-${Date.now()}`;
  const label =
    params.period === "YEARLY" ? "SiniKos Pro 12 bulan" : "SiniKos Pro 1 bulan";

  try {
    const res = await fetch(
      `${snapBaseUrl(config.isProduction)}/snap/v1/transactions`,
      {
        method: "POST",
        headers: {
          Authorization: authHeader(config.serverKey),
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Append-Notification": subscriptionNotifyUrl(),
        },
        body: JSON.stringify({
          transaction_details: {
            order_id: orderId,
            gross_amount: amount,
          },
          item_details: [
            {
              id: subscription.id,
              price: amount,
              quantity: 1,
              name: label,
            },
          ],
          customer_details: {
            first_name: params.customerName.slice(0, 50),
            email: params.customerEmail,
          },
          callbacks: {
            finish: `${appBaseUrl()}/langganan/selesai`,
          },
        }),
      },
    );

    const data = (await res.json()) as {
      token?: string;
      redirect_url?: string;
      error_messages?: string[];
      status_message?: string;
    };

    if (!res.ok || !data.redirect_url) {
      await db.subscription.update({
        where: { id: subscription.id },
        data: { status: "CANCELED" },
      });
      const detail =
        data.error_messages?.join(", ") ||
        data.status_message ||
        "Midtrans menolak transaksi";
      const mode = config.isProduction ? "production" : "sandbox";
      return {
        ok: false,
        error: `Midtrans HTTP ${res.status} (${mode}): ${detail}`,
      };
    }

    await db.subscription.update({
      where: { id: subscription.id },
      data: {
        midtransOrderId: orderId,
        paymentUrl: data.redirect_url,
      },
    });

    return { ok: true, url: data.redirect_url };
  } catch (e) {
    await db.subscription.update({
      where: { id: subscription.id },
      data: { status: "CANCELED" },
    });
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Gagal membuat pembayaran langganan",
    };
  }
}

export async function handleSubscriptionNotification(body: NotifyBody) {
  const orderId = body.order_id ?? "";
  const statusCode = body.status_code ?? "";
  const grossAmount = body.gross_amount ?? "";
  const signatureKey = body.signature_key ?? "";

  if (!orderId.startsWith("SUB-")) {
    return {
      ok: true as const,
      ignored: true as const,
      reason: "not_subscription",
    };
  }

  const config = getPlatformMidtransConfig();
  if (!config.ok) {
    console.error("[midtrans/subscription] platform key missing");
    return { ok: false as const, error: "Platform Midtrans belum dikonfigurasi" };
  }

  const subscription = await findSubscriptionByOrderId(orderId);
  if (!subscription) {
    return {
      ok: true as const,
      ignored: true as const,
      reason: "unknown_order",
    };
  }

  if (
    !verifyMidtransSignature({
      orderId,
      statusCode,
      grossAmount,
      signatureKey,
      serverKey: config.serverKey,
    })
  ) {
    console.error("[midtrans/subscription] signature mismatch", { orderId });
    return { ok: false as const, error: "Signature tidak valid" };
  }

  const status = body.transaction_status;
  if (status === "expire" || status === "cancel" || status === "deny") {
    await db.subscription.updateMany({
      where: { id: subscription.id, status: "PENDING" },
      data: { status: "CANCELED" },
    });
    return { ok: true as const, skipped: true as const, status };
  }

  if (!isPaidTransactionStatus(status, body.fraud_status)) {
    return { ok: true as const, skipped: true as const, status };
  }

  const amount = Math.round(Number(grossAmount));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false as const, error: "Nominal tidak valid" };
  }

  return activatePaidSubscription(subscription, {
    orderId,
    amount,
    providerRef: body.transaction_id,
  });
}

export async function syncSubscriptionPayment(
  subscriptionId: string,
  organizationId: string,
) {
  const subscription = await db.subscription.findFirst({
    where: { id: subscriptionId, organizationId },
  });
  if (!subscription) {
    return { ok: false as const, error: "Langganan tidak ditemukan" };
  }
  if (subscription.status === "ACTIVE") {
    return {
      ok: true as const,
      alreadyPaid: true as const,
      endsAt: subscription.endsAt,
      message: "Pembayaran langganan sudah tercatat.",
    };
  }
  if (!subscription.midtransOrderId) {
    return {
      ok: false as const,
      error: "Belum ada transaksi Midtrans untuk langganan ini.",
    };
  }

  const config = getPlatformMidtransConfig();
  if (!config.ok) return config;

  const url = `${apiBaseUrl(config.isProduction)}/v2/${encodeURIComponent(subscription.midtransOrderId)}/status`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: authHeader(config.serverKey),
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
    if (status === "expire" || status === "cancel" || status === "deny") {
      await db.subscription.updateMany({
        where: { id: subscription.id, status: "PENDING" },
        data: { status: "CANCELED" },
      });
      return {
        ok: true as const,
        message: `Status Midtrans: ${status}. Buat pembayaran baru jika ingin lanjut.`,
      };
    }

    if (!isPaidTransactionStatus(status, data.fraud_status)) {
      return {
        ok: true as const,
        pending: true as const,
        message: `Status Midtrans: ${status ?? "belum lunas"}. Selesaikan pembayaran, lalu cek lagi.`,
      };
    }

    const amount = Math.round(Number(data.gross_amount ?? 0));
    const result = await activatePaidSubscription(subscription, {
      orderId: data.order_id ?? subscription.midtransOrderId,
      amount,
      providerRef: data.transaction_id,
    });
    if (!result.ok) return result;
    return { ...result, message: "Pembayaran langganan berhasil." };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Gagal menghubungi Midtrans",
    };
  }
}

/** Cek beberapa langganan PENDING saat halaman dibuka (webhook kadang terlambat). */
export async function syncPendingSubscriptions(organizationId: string) {
  const pending = await db.subscription.findMany({
    where: {
      organizationId,
      status: "PENDING",
      midtransOrderId: { not: null },
    },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  for (const subscription of pending) {
    try {
      await syncSubscriptionPayment(subscription.id, organizationId);
    } catch (e) {
      console.error("[midtrans/subscription] sync pending", e);
    }
  }
}
