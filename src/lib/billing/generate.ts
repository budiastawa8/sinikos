import { BillingCycle, InvoiceStatus, LeaseStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { expireLapsedPlans } from "@/lib/billing/entitlements";
import { isProActive } from "@/lib/billing/plans";
import { assertWhatsAppQuotaAvailable } from "@/lib/billing/whatsapp-quota";
import {
  clampBillingDay,
  dueDateFor,
  periodKey,
} from "@/lib/billing/cycle";
import { MONTHS_ID, formatRupiah, normalizePhone } from "@/lib/utils";
import {
  createSnapPayment,
  isOrgMidtransConfigured,
} from "@/lib/payments/midtrans";
import { sendWhatsAppMessage } from "@/lib/whatsapp/fonnte";

export function buildInvoiceMessage(params: {
  tenantName: string;
  propertyName: string;
  roomCode: string;
  year: number;
  month: number;
  amount: number;
  dueDate: Date;
  payInfo: string;
  paymentUrl?: string | null;
}) {
  const period = `${MONTHS_ID[params.month - 1]} ${params.year}`;
  const due = params.dueDate.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const lines = [
    `Halo ${params.tenantName},`,
    ``,
    `Tagihan kos *${params.propertyName}* kamar *${params.roomCode}* periode *${period}* sebesar *${formatRupiah(params.amount)}*.`,
    `Jatuh tempo: ${due}.`,
    ``,
  ];

  if (params.paymentUrl) {
    lines.push(`Bayar online (transfer / e-wallet / QRIS):`);
    lines.push(params.paymentUrl);
    lines.push(``);
  }

  lines.push(params.payInfo, ``, `— SiniKos`);
  return lines.join("\n");
}

function sameCalendarDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export async function generateInvoicesForOrg(
  organizationId: string,
  asOf = new Date(),
  opts?: { onlyDueToday?: boolean },
) {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
  });
  if (!org) return { created: 0, invoices: [] as string[] };

  const { year, month } = periodKey(asOf);
  const today = asOf.getDate();
  const leases = await db.lease.findMany({
    where: { organizationId, status: LeaseStatus.ACTIVE },
    include: {
      room: { include: { property: true } },
      tenant: true,
    },
  });

  const createdIds: string[] = [];

  for (const lease of leases) {
    if (lease.startDate > asOf) continue;

    const anchor =
      org.billingCycle === BillingCycle.ANNIVERSARY
        ? clampBillingDay(lease.billingAnchorDay)
        : clampBillingDay(org.billingDay);

    if (opts?.onlyDueToday && today !== anchor) continue;

    const existing = await db.invoice.findUnique({
      where: {
        leaseId_periodYear_periodMonth: {
          leaseId: lease.id,
          periodYear: year,
          periodMonth: month,
        },
      },
    });
    if (existing) continue;

    const dueDate = dueDateFor(year, month, anchor);
    const invoice = await db.invoice.create({
      data: {
        organizationId,
        leaseId: lease.id,
        periodYear: year,
        periodMonth: month,
        amount: lease.monthlyRent,
        dueDate,
        status: InvoiceStatus.UNPAID,
      },
    });
    createdIds.push(invoice.id);
  }

  return { created: createdIds.length, invoices: createdIds };
}

export async function sendInvoiceWhatsApp(invoiceId: string) {
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

  if (!invoice) {
    return { ok: false as const, error: "Tagihan tidak ditemukan" };
  }

  if (!isProActive(invoice.organization)) {
    return {
      ok: false as const,
      error:
        "WhatsApp otomatis tersedia di paket Pro. Buka menu Langganan untuk upgrade.",
    };
  }

  const quota = await assertWhatsAppQuotaAvailable(invoice.organizationId);
  if (!quota.ok) {
    return { ok: false as const, error: quota.error };
  }

  let paymentUrl = invoice.paymentUrl;
  if (
    isOrgMidtransConfigured(invoice.organization) &&
    invoice.status !== InvoiceStatus.PAID &&
    invoice.amountPaid < invoice.amount
  ) {
    const snap = await createSnapPayment(invoice.id);
    if (snap.ok) paymentUrl = snap.redirectUrl;
  }

  const message = buildInvoiceMessage({
    tenantName: invoice.lease.tenant.name,
    propertyName: invoice.lease.room.property.name,
    roomCode: invoice.lease.room.code,
    year: invoice.periodYear,
    month: invoice.periodMonth,
    amount: invoice.amount - invoice.amountPaid,
    dueDate: invoice.dueDate,
    payInfo: invoice.organization.whatsappPayInfo,
    paymentUrl,
  });

  const phone = normalizePhone(invoice.lease.tenant.phone);
  const result = await sendWhatsAppMessage(phone, message);

  await db.whatsAppMessageLog.create({
    data: {
      organizationId: invoice.organizationId,
      invoiceId: invoice.id,
      phone,
      message,
      status: result.ok ? "SENT" : "FAILED",
      providerRef: result.ok ? result.providerRef : undefined,
      errorMessage: result.ok ? undefined : result.error,
      sentAt: result.ok ? new Date() : undefined,
    },
  });

  return result;
}

export async function runDailyBillingJob(asOf = new Date()) {
  const { expired: expiredPlans } = await expireLapsedPlans(asOf);
  const orgs = await db.organization.findMany();
  let invoicesCreated = 0;
  let messagesSent = 0;
  let messagesFailed = 0;

  for (const org of orgs) {
    const gen = await generateInvoicesForOrg(org.id, asOf, {
      onlyDueToday: true,
    });
    invoicesCreated += gen.created;

    if (!org.whatsappEnabled || !isProActive(org)) continue;

    const invoices = await db.invoice.findMany({
      where: {
        organizationId: org.id,
        status: {
          in: [
            InvoiceStatus.UNPAID,
            InvoiceStatus.PARTIAL,
            InvoiceStatus.OVERDUE,
          ],
        },
      },
      include: {
        whatsappLogs: {
          where: { status: "SENT" },
          take: 1,
        },
      },
    });

    for (const invoice of invoices) {
      const alreadySent = invoice.whatsappLogs.length > 0;
      const isDueDay = sameCalendarDay(invoice.dueDate, asOf);
      const reminderDate = new Date(invoice.dueDate);
      reminderDate.setDate(reminderDate.getDate() - org.reminderDaysBefore);
      const isReminderDay = sameCalendarDay(reminderDate, asOf);

      if (!isDueDay && !isReminderDay) continue;
      if (alreadySent && !isReminderDay) continue;

      const result = await sendInvoiceWhatsApp(invoice.id);
      if (result.ok) messagesSent += 1;
      else messagesFailed += 1;
    }

    await db.invoice.updateMany({
      where: {
        organizationId: org.id,
        status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL] },
        dueDate: { lt: asOf },
      },
      data: { status: InvoiceStatus.OVERDUE },
    });
  }

  return { invoicesCreated, messagesSent, messagesFailed, expiredPlans };
}
