import type { PlanCode } from "@prisma/client";
import { db } from "@/lib/db";
import {
  activePlanCode,
  whatsAppMonthlyQuotaForPlan,
} from "@/lib/billing/plans";

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
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { plan: true, planExpiresAt: true },
  });
  const plan: PlanCode = org ? activePlanCode(org, asOf) : "FREE";
  const limit = whatsAppMonthlyQuotaForPlan(plan);
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
    plan,
    periodLabel: start.toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    }),
  };
}

export async function assertWhatsAppQuotaAvailable(organizationId: string) {
  const usage = await getWhatsAppQuotaUsage(organizationId);
  if (usage.exhausted) {
    const upgradeHint =
      usage.plan === "FREE"
        ? " Upgrade ke Pro untuk kuota 200 pesan/bulan dan reminder otomatis."
        : usage.plan === "PRO"
          ? " Upgrade ke Pro+ untuk kuota lebih besar, atau tunggu bulan depan."
          : " Pengiriman dilanjut bulan depan.";
    return {
      ok: false as const,
      error: `Kuota WhatsApp bulan ${usage.periodLabel} sudah habis (${usage.used}/${usage.limit}).${upgradeHint}`,
      usage,
    };
  }
  return { ok: true as const, usage };
}
