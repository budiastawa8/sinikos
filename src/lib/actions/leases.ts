"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";

export async function checkInAction(formData: FormData) {
  const { organizationId } = await requireOrg();
  const roomId = String(formData.get("roomId") ?? "");
  const tenantId = String(formData.get("tenantId") ?? "");
  const startDate = String(formData.get("startDate") ?? "");
  const monthlyRent = Number(formData.get("monthlyRent"));

  const room = await db.room.findFirst({
    where: { id: roomId, property: { organizationId } },
  });
  const tenant = await db.tenant.findFirst({
    where: { id: tenantId, organizationId },
  });

  if (!room || !tenant) throw new Error("Kamar atau penyewa tidak valid");
  if (room.status === "OCCUPIED") throw new Error("Kamar sudah terisi");
  if (!startDate) throw new Error("Tanggal mulai wajib");
  if (!Number.isFinite(monthlyRent) || monthlyRent <= 0) {
    throw new Error("Harga sewa tidak valid");
  }

  const active = await db.lease.findFirst({
    where: { roomId, status: "ACTIVE" },
  });
  if (active) throw new Error("Kamar masih punya kontrak aktif");

  await db.$transaction([
    db.lease.create({
      data: {
        organizationId,
        roomId,
        tenantId,
        startDate: new Date(startDate),
        monthlyRent,
        status: "ACTIVE",
      },
    }),
    db.room.update({
      where: { id: roomId },
      data: { status: "OCCUPIED" },
    }),
  ]);

  revalidatePath("/leases");
  revalidatePath("/dashboard");
  revalidatePath(`/properties/${room.propertyId}`);
}

export async function checkOutAction(formData: FormData) {
  const { organizationId } = await requireOrg();
  const leaseId = String(formData.get("leaseId") ?? "");

  const lease = await db.lease.findFirst({
    where: { id: leaseId, organizationId, status: "ACTIVE" },
  });
  if (!lease) throw new Error("Kontrak tidak ditemukan");

  await db.$transaction([
    db.lease.update({
      where: { id: leaseId },
      data: { status: "ENDED", endDate: new Date() },
    }),
    db.room.update({
      where: { id: lease.roomId },
      data: { status: "AVAILABLE" },
    }),
  ]);

  revalidatePath("/leases");
  revalidatePath("/dashboard");
}
