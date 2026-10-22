import type { PlanCode } from "@prisma/client";

/** Harga langganan Pro dalam rupiah (akun Midtrans platform). */
export const PRO_PRICES = {
  MONTHLY: 50_000,
  YEARLY: 500_000,
} as const;

/** Harga langganan Pro+ (multi-staf + laporan). */
export const PRO_PLUS_PRICES = {
  MONTHLY: 99_000,
  YEARLY: 990_000,
} as const;

/** Kuota pesan WhatsApp terkirim per organisasi per bulan kalender (paket Pro). */
export const DEFAULT_PRO_WA_MONTHLY_QUOTA = 200;

/** Kuota WhatsApp paket Pro+. */
export const DEFAULT_PRO_PLUS_WA_MONTHLY_QUOTA = 500;

/** Maksimal anggota staf (bukan owner) di Pro+. */
export const PRO_PLUS_MAX_STAFF = 5;

export function proWhatsAppMonthlyQuota() {
  const raw = process.env.PLATFORM_WA_MONTHLY_QUOTA?.trim();
  if (!raw) return DEFAULT_PRO_WA_MONTHLY_QUOTA;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_PRO_WA_MONTHLY_QUOTA;
  return Math.floor(n);
}

export function proPlusWhatsAppMonthlyQuota() {
  const raw = process.env.PLATFORM_WA_PRO_PLUS_MONTHLY_QUOTA?.trim();
  if (!raw) return DEFAULT_PRO_PLUS_WA_MONTHLY_QUOTA;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_PRO_PLUS_WA_MONTHLY_QUOTA;
  return Math.floor(n);
}

export function whatsAppMonthlyQuotaForPlan(plan: PlanCode) {
  if (plan === "PRO_PLUS") return proPlusWhatsAppMonthlyQuota();
  return proWhatsAppMonthlyQuota();
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
  PRO_PLUS: [
    "Semua fitur Pro",
    `Multi-staf hingga ${PRO_PLUS_MAX_STAFF} karyawan (login terpisah)`,
    "Laporan tunggakan & okupansi + export CSV",
    `Kuota WhatsApp lebih besar (${DEFAULT_PRO_PLUS_WA_MONTHLY_QUOTA} pesan/bulan)`,
  ],
} as const;

export const LIMIT_REACHED_COPY = {
  properti:
    "Paket Gratis maksimal 1 properti. Upgrade ke Pro untuk menambah kos.",
  kamar: "Paket Gratis maksimal 5 kamar. Upgrade ke Pro untuk menambah kamar.",
  kontrak:
    "Paket Gratis maksimal 5 kontrak aktif. Upgrade ke Pro untuk check-in baru.",
  staf: "Multi-staf tersedia di Pro+. Upgrade untuk menambah karyawan.",
  laporan: "Laporan tersedia di paket Pro+. Upgrade untuk membuka menu Laporan.",
} as const;

export type LimitReachedKey = keyof typeof LIMIT_REACHED_COPY;

export type PlanLimits = {
  maxProperties: number | null;
  maxRooms: number | null;
  maxActiveLeases: number | null;
  maxStaff: number;
  whatsapp: boolean;
  onlineRentPayment: boolean;
  reports: boolean;
};

const FREE_LIMITS: PlanLimits = {
  maxProperties: 1,
  maxRooms: 5,
  maxActiveLeases: 5,
  maxStaff: 0,
  whatsapp: false,
  onlineRentPayment: false,
  reports: false,
};

const PRO_LIMITS: PlanLimits = {
  maxProperties: null,
  maxRooms: null,
  maxActiveLeases: null,
  maxStaff: 0,
  whatsapp: true,
  onlineRentPayment: true,
  reports: false,
};

const PRO_PLUS_LIMITS: PlanLimits = {
  maxProperties: null,
  maxRooms: null,
  maxActiveLeases: null,
  maxStaff: PRO_PLUS_MAX_STAFF,
  whatsapp: true,
  onlineRentPayment: true,
  reports: true,
};

const PAID_PLANS: PlanCode[] = ["PRO", "PRO_PLUS"];

export function isPaidPlan(plan: PlanCode) {
  return PAID_PLANS.includes(plan);
}

/** Pro atau Pro+ masih berlaku (fitur bayar: Midtrans sewa, WA, tanpa batas kamar). */
export function isProActive(
  org: { plan: PlanCode; planExpiresAt: Date | null },
  now = new Date(),
) {
  return (
    isPaidPlan(org.plan) &&
    org.planExpiresAt != null &&
    org.planExpiresAt.getTime() > now.getTime()
  );
}

export function isProPlusActive(
  org: { plan: PlanCode; planExpiresAt: Date | null },
  now = new Date(),
) {
  return (
    org.plan === "PRO_PLUS" &&
    org.planExpiresAt != null &&
    org.planExpiresAt.getTime() > now.getTime()
  );
}

export function activePlanCode(
  org: { plan: PlanCode; planExpiresAt: Date | null },
  now = new Date(),
): PlanCode {
  if (!isProActive(org, now)) return "FREE";
  return org.plan === "PRO_PLUS" ? "PRO_PLUS" : "PRO";
}

export function planLabel(code: PlanCode) {
  if (code === "PRO_PLUS") return "Pro+";
  if (code === "PRO") return "Pro";
  return "Gratis";
}

export function planRank(plan: PlanCode) {
  if (plan === "PRO_PLUS") return 2;
  if (plan === "PRO") return 1;
  return 0;
}

export function higherPlan(a: PlanCode, b: PlanCode): PlanCode {
  return planRank(a) >= planRank(b) ? a : b;
}

export function limitsFor(code: PlanCode): PlanLimits {
  if (code === "PRO_PLUS") return PRO_PLUS_LIMITS;
  if (code === "PRO") return PRO_LIMITS;
  return FREE_LIMITS;
}

export function canAdd(current: number, max: number | null) {
  if (max == null) return true;
  return current < max;
}

export function periodMonths(period: "MONTHLY" | "YEARLY") {
  return period === "YEARLY" ? 12 : 1;
}

export function priceForPeriod(
  period: "MONTHLY" | "YEARLY",
  plan: "PRO" | "PRO_PLUS" = "PRO",
) {
  if (plan === "PRO_PLUS") {
    return period === "YEARLY"
      ? PRO_PLUS_PRICES.YEARLY
      : PRO_PLUS_PRICES.MONTHLY;
  }
  return period === "YEARLY" ? PRO_PRICES.YEARLY : PRO_PRICES.MONTHLY;
}
