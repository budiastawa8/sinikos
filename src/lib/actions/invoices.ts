"use server";

import { revalidatePath } from "next/cache";
import { InvoiceStatus } from "@prisma/client";
import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";
import {
  generateInvoicesForOrg,
  sendInvoiceWhatsApp,
} from "@/lib/billing/generate";
import { createSnapPayment } from "@/lib/payments/midtrans";

function deriveStatus(amount: number, amountPaid: number, dueDate: Date) {
  if (amountPaid >= amount) return InvoiceStatus.PAID;
  if (amountPaid > 0) {
    return dueDate < new Date() ? InvoiceStatus.OVERDUE : InvoiceStatus.PARTIAL;
  }
  return dueDate < new Date() ? InvoiceStatus.OVERDUE : InvoiceStatus.UNPAID;
}

export async function generateInvoicesNowAction() {
  const { organizationId } = await requireOrg();
  const result = await generateInvoicesForOrg(organizationId);
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  return result;
}

export async function recordPaymentAction(formData: FormData) {
  const { organizationId } = await requireOrg();
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const amount = Number(formData.get("amount"));
  const method = String(formData.get("method") ?? "TRANSFER");
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, organizationId },
  });
  if (!invoice) throw new Error("Tagihan tidak ditemukan");
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Nominal pembayaran tidak valid");
  }

  const amountPaid = invoice.amountPaid + amount;
  const status = deriveStatus(invoice.amount, amountPaid, invoice.dueDate);

  await db.$transaction([
    db.payment.create({
      data: { invoiceId, amount, method, notes },
    }),
    db.invoice.update({
      where: { id: invoiceId },
      data: { amountPaid, status },
    }),
  ]);

  revalidatePath("/invoices");
  revalidatePath("/dashboard");
}

export async function resendWhatsAppAction(formData: FormData) {
  const { organizationId, organization } = await requireOrg();
  if (!organization.whatsappEnabled) {
    throw new Error("WhatsApp dinonaktifkan di pengaturan");
  }

  const invoiceId = String(formData.get("invoiceId") ?? "");
  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, organizationId },
  });
  if (!invoice) throw new Error("Tagihan tidak ditemukan");

  const result = await sendInvoiceWhatsApp(invoiceId);
  revalidatePath("/invoices");
  if (!result.ok) throw new Error(result.error);
}

/** Buat / perbarui link bayar Midtrans (Snap) untuk penyewa */
export async function createPaymentLinkAction(formData: FormData) {
  const { organizationId } = await requireOrg();
  const invoiceId = String(formData.get("invoiceId") ?? "");

  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, organizationId },
  });
  if (!invoice) throw new Error("Tagihan tidak ditemukan");

  const result = await createSnapPayment(invoiceId);
  revalidatePath("/invoices");
  if (!result.ok) throw new Error(result.error);
  return { url: result.redirectUrl };
}
