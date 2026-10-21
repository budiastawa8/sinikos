"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";
import {
  encryptSecret,
  normalizeEnvLike,
} from "@/lib/crypto/secrets";

export async function updateSettingsAction(formData: FormData) {
  const { organizationId } = await requireOrg();
  const name = String(formData.get("name") ?? "").trim();
  const billingDay = Number(formData.get("billingDay"));
  const reminderDaysBefore = Number(formData.get("reminderDaysBefore"));
  const whatsappEnabled = formData.get("whatsappEnabled") === "on";
  const whatsappPayInfo = String(formData.get("whatsappPayInfo") ?? "").trim();

  if (name.length < 2) throw new Error("Nama bisnis wajib");
  if (!Number.isInteger(billingDay) || billingDay < 1 || billingDay > 28) {
    throw new Error("Tanggal tagihan harus 1–28");
  }
  if (
    !Number.isInteger(reminderDaysBefore) ||
    reminderDaysBefore < 0 ||
    reminderDaysBefore > 14
  ) {
    throw new Error("Hari reminder harus 0–14");
  }

  await db.organization.update({
    where: { id: organizationId },
    data: {
      name,
      billingDay,
      reminderDaysBefore,
      whatsappEnabled,
      whatsappPayInfo:
        whatsappPayInfo ||
        "Silakan transfer ke rekening yang tertera / hubungi pengelola.",
    },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function updateMidtransSettingsAction(formData: FormData) {
  const { organizationId, organization } = await requireOrg();

  const midtransEnabled = formData.get("midtransEnabled") === "on";
  const midtransIsProduction = formData.get("midtransIsProduction") === "on";
  const serverKeyRaw = normalizeEnvLike(
    String(formData.get("midtransServerKey") ?? ""),
  );
  const clientKeyRaw = normalizeEnvLike(
    String(formData.get("midtransClientKey") ?? ""),
  );
  const clearKeys = formData.get("clearMidtransKeys") === "on";

  if (midtransEnabled && !serverKeyRaw && !organization.midtransServerKeyEnc) {
    throw new Error(
      "Server Key Midtrans wajib diisi saat mengaktifkan pembayaran online",
    );
  }

  if (serverKeyRaw) {
    const looksServer =
      serverKeyRaw.startsWith("Mid-server-") ||
      serverKeyRaw.startsWith("SB-Mid-server-");
    if (!looksServer) {
      throw new Error(
        "Server Key tidak valid. Harus diawali Mid-server- atau SB-Mid-server-",
      );
    }
    const isSandboxKey = serverKeyRaw.startsWith("SB-");
    if (midtransIsProduction && isSandboxKey) {
      throw new Error(
        "Key Sandbox tidak cocok dengan mode Production. Matikan Production atau pakai key Production.",
      );
    }
    if (!midtransIsProduction && !isSandboxKey) {
      throw new Error(
        "Key Production tidak cocok dengan mode Sandbox. Aktifkan Production atau pakai key SB-…",
      );
    }
  }

  if (clientKeyRaw) {
    const looksClient =
      clientKeyRaw.startsWith("Mid-client-") ||
      clientKeyRaw.startsWith("SB-Mid-client-");
    if (!looksClient) {
      throw new Error(
        "Client Key tidak valid. Harus diawali Mid-client- atau SB-Mid-client-",
      );
    }
  }

  const data: {
    midtransEnabled: boolean;
    midtransIsProduction: boolean;
    midtransServerKeyEnc?: string | null;
    midtransClientKeyEnc?: string | null;
  } = {
    midtransEnabled,
    midtransIsProduction,
  };

  if (clearKeys) {
    data.midtransServerKeyEnc = null;
    data.midtransClientKeyEnc = null;
    data.midtransEnabled = false;
  } else {
    if (serverKeyRaw) {
      data.midtransServerKeyEnc = encryptSecret(serverKeyRaw);
    }
    if (clientKeyRaw) {
      data.midtransClientKeyEnc = encryptSecret(clientKeyRaw);
    }
  }

  await db.organization.update({
    where: { id: organizationId },
    data,
  });

  revalidatePath("/settings");
  revalidatePath("/invoices");
}
