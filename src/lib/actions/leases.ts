"use server";

import { revalidatePath } from "next/cache";
import {
  InvoiceStatus,
  LeaseStatus,
  RoomStatus,
} from "@prisma/client";
import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";
import { assertCanAddLease } from "@/lib/billing/entitlements";
import {
  clampBillingDay,
  computeFirstInvoice,
  parseDateInput,
} from "@/lib/billing/cycle";

export async function checkInAction(formData: FormData) {
  const { organizationId, organization } = await requireOrg();
  await assertCanAddLease(organization);
  const roomId = String(formData.get("roomId") ?? "");
  const tenantId = String(formData.get("tenantId") ?? "");
  const startDateRaw = String(formData.get("startDate") ?? "");
  const monthlyRent = Number(formData.get("monthlyRent"));

  const room = await db.room.findFirst({
    where: { id: roomId, property: { organizationId } },
  });
  const tenant = await db.tenant.findFirst({
    where: { id: tenantId, organizationId },
  });

  if (!room || !tenant) throw new Error("Kamar atau penyewa tidak valid");
  if (room.status === RoomStatus.OCCUPIED) {
    throw new Error("Kamar sudah terisi");
  }
  if (!startDateRaw) throw new Error("Tanggal masuk wajib");
  if (!Number.isFinite(monthlyRent) || monthlyRent <= 0) {
    throw new Error("Harga sewa tidak valid");
  }

  const startDate = parseDateInput(startDateRaw);
  const billingAnchorDay = clampBillingDay(startDate.getDate());

  const blocking = await db.lease.findFirst({
    where: {
      roomId,
      status: { in: [LeaseStatus.ACTIVE, LeaseStatus.PENDING] },
    },
  });
  if (blocking) {
    throw new Error(
      blocking.status === LeaseStatus.PENDING
        ? "Kamar masih punya check-in menunggu pelunasan tagihan pertama"
        : "Kamar masih punya kontrak aktif",
    );
  }

  const first = computeFirstInvoice({
    billingCycle: organization.billingCycle,
    monthlyRent,
    startDate,
    billingDay: organization.billingDay,
    billingAnchorDay,
  });

  if (first.amount <= 0) {
    throw new Error("Nominal tagihan pertama tidak valid");
  }

  await db.$transaction(async (tx) => {
    const created = await tx.lease.create({
      data: {
        organizationId,
        roomId,
        tenantId,
        startDate,
        monthlyRent,
        billingAnchorDay,
        status: LeaseStatus.PENDING,
      },
    });

    await tx.invoice.create({
      data: {
        organizationId,
        leaseId: created.id,
        periodYear: first.periodYear,
        periodMonth: first.periodMonth,
        amount: first.amount,
        dueDate: first.dueDate,
        status: InvoiceStatus.UNPAID,
      },
    });
  });

  revalidatePath("/leases");
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  revalidatePath(`/properties/${room.propertyId}`);
}

export async function cancelPendingLeaseAction(formData: FormData) {
  const { organizationId } = await requireOrg();
  const leaseId = String(formData.get("leaseId") ?? "");

  const lease = await db.lease.findFirst({
    where: {
      id: leaseId,
      organizationId,
      status: LeaseStatus.PENDING,
    },
    include: {
      invoices: { select: { id: true, status: true, amountPaid: true } },
      room: { select: { propertyId: true } },
    },
  });
  if (!lease) throw new Error("Kontrak menunggu bayar tidak ditemukan");

  const hasPaid = lease.invoices.some(
    (inv) => inv.status === InvoiceStatus.PAID || inv.amountPaid > 0,
  );
  if (hasPaid) {
    throw new Error(
      "Sudah ada pembayaran. Lunasi/selesaikan lewat Tagihan, atau hubungi dukungan.",
    );
  }

  await db.$transaction([
    db.invoice.deleteMany({ where: { leaseId: lease.id } }),
    db.lease.delete({ where: { id: lease.id } }),
  ]);

  revalidatePath("/leases");
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  revalidatePath(`/properties/${lease.room.propertyId}`);
}

export async function checkOutAction(formData: FormData) {
  const { organizationId } = await requireOrg();
  const leaseId = String(formData.get("leaseId") ?? "");

  const lease = await db.lease.findFirst({
    where: { id: leaseId, organizationId, status: LeaseStatus.ACTIVE },
  });
  if (!lease) throw new Error("Kontrak tidak ditemukan");

  await db.$transaction([
    db.lease.update({
      where: { id: leaseId },
      data: { status: LeaseStatus.ENDED, endDate: new Date() },
    }),
    db.room.update({
      where: { id: lease.roomId },
      data: { status: RoomStatus.AVAILABLE },
    }),
  ]);

  revalidatePath("/leases");
  revalidatePath("/dashboard");
}
