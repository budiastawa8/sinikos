import { db } from "@/lib/db";
import { proWhatsAppMonthlyQuota } from "@/lib/billing/plans";

export function whatsappQuotaMonthRange(asOf = new Date()) {
  const start = new Date(asOf.getFullYear(), asOf.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(
    asOf.getFullYear(),
    asOf.getMonth() + 1,
    1,
    0,
    0,
    0,
    0,
  );
  return { start, end };
}

export async function getWhatsAppQuotaUsage(
  organizationId: string,
  asOf = new Date(),
) {
  const limit = proWhatsAppMonthlyQuota();
  const { start, end } = whatsappQuotaMonthRange(asOf);
  const used = await db.whatsAppMessageLog.count({
    where: {
      organizationId,
      status: "SENT",
      createdAt: { gte: start, lt: end },
    },
  });
  const remaining = Math.max(0, limit - used);
  return {
    used,
    limit,
    remaining,
    exhausted: used >= limit,
    nearLimit: used >= Math.ceil(limit * 0.8),
    periodLabel: start.toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    }),
  };
}

export async function assertWhatsAppQuotaAvailable(organizationId: string) {
  const usage = await getWhatsAppQuotaUsage(organizationId);
  if (usage.exhausted) {
    return {
      ok: false as const,
      error: `Kuota WhatsApp bulan ${usage.periodLabel} sudah habis (${usage.used}/${usage.limit}). Pengiriman dilanjut bulan depan, atau hubungi pengelola SiniKos.`,
      usage,
    };
  }
  return { ok: true as const, usage };
}
