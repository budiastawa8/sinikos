"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";
import {
  assertCanAddProperty,
  assertCanAddRoom,
} from "@/lib/billing/entitlements";

export async function createPropertyAction(formData: FormData) {
  const { organizationId, organization } = await requireOrg();
  await assertCanAddProperty(organization);
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim() || null;
  if (name.length < 2) throw new Error("Nama properti wajib diisi");

  await db.property.create({
    data: { organizationId, name, address },
  });
  revalidatePath("/properties");
  revalidatePath("/dashboard");
}

export async function createRoomAction(formData: FormData) {
  const { organizationId, organization } = await requireOrg();
  await assertCanAddRoom(organization);
  const propertyId = String(formData.get("propertyId") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  const price = Number(formData.get("price"));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const property = await db.property.findFirst({
    where: { id: propertyId, organizationId },
  });
  if (!property) throw new Error("Properti tidak ditemukan");
  if (!code) throw new Error("Kode kamar wajib");
  if (!Number.isFinite(price) || price <= 0) throw new Error("Harga tidak valid");

  await db.room.create({
    data: { propertyId, code, price, notes },
  });
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath("/dashboard");
}

export async function updateRoomStatusAction(formData: FormData) {
  const { organizationId } = await requireOrg();
  const roomId = String(formData.get("roomId") ?? "");
  const status = String(formData.get("status") ?? "") as
    | "AVAILABLE"
    | "OCCUPIED"
    | "MAINTENANCE";

  const room = await db.room.findFirst({
    where: { id: roomId, property: { organizationId } },
  });
  if (!room) throw new Error("Kamar tidak ditemukan");

  await db.room.update({ where: { id: roomId }, data: { status } });
  revalidatePath(`/properties/${room.propertyId}`);
  revalidatePath("/dashboard");
}

const tenantSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(9, "Nomor WhatsApp wajib"),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().optional(),
});

export async function createTenantAction(formData: FormData) {
  const { organizationId } = await requireOrg();
  const parsed = tenantSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email") || "",
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  await db.tenant.create({
    data: {
      organizationId,
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      notes: parsed.data.notes || null,
    },
  });
  revalidatePath("/tenants");
}

export async function deleteTenantAction(formData: FormData) {
  const { organizationId } = await requireOrg();
  const id = String(formData.get("id") ?? "");
  const activeLease = await db.lease.findFirst({
    where: { tenantId: id, organizationId, status: "ACTIVE" },
  });
  if (activeLease) throw new Error("Penyewa masih punya kontrak aktif");

  await db.tenant.deleteMany({ where: { id, organizationId } });
  revalidatePath("/tenants");
}
