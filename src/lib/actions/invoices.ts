"use server";

import { revalidatePath } from "next/cache";
import { InvoiceStatus } from "@prisma/client";
import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";
import {
  generateInvoicesForOrg,
  sendInvoiceWhatsApp,
} from "@/lib/billing/generate";
import { activateLeaseIfFirstInvoicePaid } from "@/lib/billing/activate-lease";
import { isProActive } from "@/lib/billing/plans";
import {
  createSnapPayment,
  syncInvoicePaymentStatus,
} from "@/lib/payments/midtrans";

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

  if (status === InvoiceStatus.PAID) {
    await activateLeaseIfFirstInvoicePaid(invoiceId);
  }

  revalidatePath("/invoices");
  revalidatePath("/leases");
  revalidatePath("/dashboard");
}

export async function resendWhatsAppAction(
  formData: FormData,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  try {
    const { organizationId, organization } = await requireOrg();
    if (!isProActive(organization)) {
      return {
        ok: false,
        error:
          "WhatsApp otomatis tersedia di paket Pro. Buka menu Langganan untuk upgrade.",
      };
    }
    if (!organization.whatsappEnabled) {
      return {
        ok: false,
        error: "WhatsApp dinonaktifkan di pengaturan",
      };
    }

    const invoiceId = String(formData.get("invoiceId") ?? "");
    const invoice = await db.invoice.findFirst({
      where: { id: invoiceId, organizationId },
    });
    if (!invoice) {
      return { ok: false, error: "Tagihan tidak ditemukan" };
    }

    const result = await sendInvoiceWhatsApp(invoiceId);
    revalidatePath("/invoices");
    revalidatePath("/dashboard");
    revalidatePath("/settings");
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    return { ok: true, message: "WhatsApp terkirim" };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Gagal mengirim WhatsApp",
    };
  }
}

/** Buat / perbarui link bayar Midtrans (Snap) untuk penyewa */
export async function createPaymentLinkAction(
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const { organizationId } = await requireOrg();
    const invoiceId = String(formData.get("invoiceId") ?? "");

    const invoice = await db.invoice.findFirst({
      where: { id: invoiceId, organizationId },
    });
    if (!invoice) {
      return { ok: false, error: "Tagihan tidak ditemukan" };
    }

    const result = await createSnapPayment(invoiceId);
    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    revalidatePath("/invoices");
    return { ok: true, url: result.redirectUrl };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Gagal membuat link bayar",
    };
  }
}

export async function syncMidtransStatusAction(
  formData: FormData,
): Promise<
  | { ok: true; message: string }
  | { ok: false; error: string }
> {
  try {
    const { organizationId } = await requireOrg();
    const invoiceId = String(formData.get("invoiceId") ?? "");
    const invoice = await db.invoice.findFirst({
      where: { id: invoiceId, organizationId },
    });
    if (!invoice) {
      return { ok: false, error: "Tagihan tidak ditemukan" };
    }

    const result = await syncInvoicePaymentStatus(invoiceId);
    revalidatePath("/invoices");
    revalidatePath("/leases");
    revalidatePath("/dashboard");

    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    if ("alreadyPaid" in result && result.alreadyPaid) {
      return { ok: true, message: "Tagihan sudah lunas" };
    }
    if ("paid" in result && result.paid) {
      return {
        ok: true,
        message:
          "Pembayaran terdeteksi — tagihan dilunasi (kamar OCCUPIED jika check-in menunggu bayar)",
      };
    }
    if ("pending" in result && result.pending) {
      return {
        ok: true,
        message:
          "message" in result && result.message
            ? result.message
            : "Pembayaran belum lunas di Midtrans",
      };
    }
    return { ok: true, message: "Status diperbarui" };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Gagal cek status",
    };
  }
}
