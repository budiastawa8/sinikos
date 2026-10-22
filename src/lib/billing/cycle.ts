import type { BillingCycle } from "@prisma/client";

/** Parse input type="date" (YYYY-MM-DD) ke tanggal lokal. */
export function parseDateInput(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) throw new Error("Tanggal tidak valid");
  return new Date(y, m - 1, d);
}

export function clampBillingDay(day: number): number {
  if (!Number.isInteger(day)) return 1;
  return Math.min(28, Math.max(1, day));
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function dueDateFor(year: number, month: number, billingDay: number) {
  const lastDay = daysInMonth(year, month);
  const day = Math.min(Math.max(billingDay, 1), lastDay);
  return new Date(year, month - 1, day, 23, 59, 59);
}

export function periodKey(date = new Date()) {
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export function addMonths(year: number, month: number, delta: number) {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

/**
 * Prorata kalender: hari check-in tidak dihitung.
 * billableDays = hari setelah check-in sampai akhir bulan.
 * Jika check-in di billingDay (biasanya 1) → sewa penuh bulan itu.
 * Jika sisa hari 0 → tagihan penuh bulan berikutnya (bayar di muka).
 */
export function computeFirstInvoice(params: {
  billingCycle: BillingCycle;
  monthlyRent: number;
  startDate: Date;
  billingDay: number;
  billingAnchorDay: number;
}): {
  amount: number;
  periodYear: number;
  periodMonth: number;
  dueDate: Date;
  isProrata: boolean;
} {
  const { billingCycle, monthlyRent, startDate, billingDay } = params;

  const year = startDate.getFullYear();
  const month = startDate.getMonth() + 1;
  const startDay = startDate.getDate();

  if (billingCycle === "ANNIVERSARY") {
    // Tagihan pertama jatuh tempo di tanggal masuk; siklus berikutnya pakai billingAnchorDay (maks 28)
    return {
      amount: monthlyRent,
      periodYear: year,
      periodMonth: month,
      dueDate: new Date(year, month - 1, startDay, 23, 59, 59),
      isProrata: false,
    };
  }

  // CALENDAR_PRORATA — bayar di muka pada tanggal masuk
  const dueDate = new Date(
    year,
    month - 1,
    startDay,
    23,
    59,
    59,
  );

  if (startDay === billingDay) {
    return {
      amount: monthlyRent,
      periodYear: year,
      periodMonth: month,
      dueDate,
      isProrata: false,
    };
  }

  const last = daysInMonth(year, month);
  const billableDays = last - startDay; // exclude check-in day

  if (billableDays <= 0) {
    const next = addMonths(year, month, 1);
    return {
      amount: monthlyRent,
      periodYear: next.year,
      periodMonth: next.month,
      dueDate,
      isProrata: false,
    };
  }

  const amount = Math.round((monthlyRent / last) * billableDays);
  return {
    amount: Math.max(amount, 0),
    periodYear: year,
    periodMonth: month,
    dueDate,
    isProrata: true,
  };
}

export function billingDayLabel(cycle: BillingCycle): string {
  return cycle === "ANNIVERSARY"
    ? "Mengikuti tanggal masuk tiap kontrak"
    : "Serempak tiap bulan (prorata di bulan pertama)";
}
