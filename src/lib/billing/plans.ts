import type { PlanCode } from "@prisma/client";

/** Harga langganan Pro dalam rupiah (akun Midtrans platform). */
export const PRO_PRICES = {
  MONTHLY: 50_000,
  YEARLY: 500_000,
} as const;

/** Kuota pesan WhatsApp terkirim per organisasi per bulan kalender (paket Pro). */
export const DEFAULT_PRO_WA_MONTHLY_QUOTA = 200;

export function proWhatsAppMonthlyQuota() {
  const raw = process.env.PLATFORM_WA_MONTHLY_QUOTA?.trim();
  if (!raw) return DEFAULT_PRO_WA_MONTHLY_QUOTA;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_PRO_WA_MONTHLY_QUOTA;
  return Math.floor(n);
}

export const PLAN_FEATURES = {
  FREE: [
    "1 properti",
    "Sampai 5 kamar",
    "Sampai 5 kontrak aktif",
    "Tagihan dan catat bayar manual",
  ],
  PRO: [
    "Properti, kamar, dan kontrak tanpa batas",
    "Link bayar Midtrans untuk uang sewa (akun Anda)",
    `WhatsApp tagihan/reminder (kuota ${DEFAULT_PRO_WA_MONTHLY_QUOTA} pesan/bulan)`,
    "Semua yang ada di paket Gratis",
  ],
} as const;

export const LIMIT_REACHED_COPY = {
  properti:
    "Paket Gratis maksimal 1 properti. Upgrade ke Pro untuk menambah kos.",
  kamar: "Paket Gratis maksimal 5 kamar. Upgrade ke Pro untuk menambah kamar.",
  kontrak:
    "Paket Gratis maksimal 5 kontrak aktif. Upgrade ke Pro untuk check-in baru.",
} as const;

export type LimitReachedKey = keyof typeof LIMIT_REACHED_COPY;

export type PlanLimits = {
  maxProperties: number | null;
  maxRooms: number | null;
  maxActiveLeases: number | null;
  whatsapp: boolean;
  onlineRentPayment: boolean;
};

const FREE_LIMITS: PlanLimits = {
  maxProperties: 1,
  maxRooms: 5,
  maxActiveLeases: 5,
  whatsapp: false,
  onlineRentPayment: false,
};

const PRO_LIMITS: PlanLimits = {
  maxProperties: null,
  maxRooms: null,
  maxActiveLeases: null,
  whatsapp: true,
  onlineRentPayment: true,
};

export function isProActive(
  org: { plan: PlanCode; planExpiresAt: Date | null },
  now = new Date(),
) {
  return (
    org.plan === "PRO" &&
    org.planExpiresAt != null &&
    org.planExpiresAt.getTime() > now.getTime()
  );
}

export function limitsFor(proActive: boolean): PlanLimits {
  return proActive ? PRO_LIMITS : FREE_LIMITS;
}

export function canAdd(current: number, max: number | null) {
  if (max == null) return true;
  return current < max;
}

export function periodMonths(period: "MONTHLY" | "YEARLY") {
  return period === "YEARLY" ? 12 : 1;
}

export function priceForPeriod(period: "MONTHLY" | "YEARLY") {
  return period === "YEARLY" ? PRO_PRICES.YEARLY : PRO_PRICES.MONTHLY;
}
