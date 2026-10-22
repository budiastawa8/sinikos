"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";
import { isProActive } from "@/lib/billing/plans";
import {
  decryptSecret,
  encryptSecret,
  normalizeEnvLike,
} from "@/lib/crypto/secrets";

export type SettingsActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateSettingsAction(formData: FormData) {
  const { organizationId, organization } = await requireOrg();
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
      whatsappEnabled: isProActive(organization) && whatsappEnabled,
      whatsappPayInfo:
        whatsappPayInfo ||
        "Silakan transfer ke rekening yang tertera / hubungi pengelola.",
    },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

/** Format key saja — Sandbox/Production dipilih lewat checkbox, bukan prefix SB-. */
function invalidServerKey(serverKey: string): string | null {
  const looksServer =
    serverKey.startsWith("Mid-server-") ||
    serverKey.startsWith("SB-Mid-server-");
  if (!looksServer) {
    return "Server Key tidak valid. Harus diawali Mid-server- atau SB-Mid-server-";
  }
  return null;
}

function invalidClientKey(clientKey: string): string | null {
  const looksClient =
    clientKey.startsWith("Mid-client-") ||
    clientKey.startsWith("SB-Mid-client-");
  if (!looksClient) {
    return "Client Key tidak valid. Harus diawali Mid-client- atau SB-Mid-client-";
  }
  return null;
}

export async function updateMidtransSettingsAction(
  formData: FormData,
): Promise<SettingsActionResult> {
  try {
    const { organizationId, organization } = await requireOrg();

    const midtransEnabled = formData.get("midtransEnabled") === "on";
    const midtransIsProduction =
      formData.get("midtransIsProduction") === "on";
    const serverKeyRaw = normalizeEnvLike(
      String(formData.get("midtransServerKey") ?? ""),
    );
    const clientKeyRaw = normalizeEnvLike(
      String(formData.get("midtransClientKey") ?? ""),
    );
    const clearKeys = formData.get("clearMidtransKeys") === "on";

    if (clearKeys) {
      await db.organization.update({
        where: { id: organizationId },
        data: {
          midtransEnabled: false,
          midtransIsProduction: false,
          midtransServerKeyEnc: null,
          midtransClientKeyEnc: null,
        },
      });
      revalidatePath("/settings");
      revalidatePath("/invoices");
      return { ok: true };
    }

    if (midtransEnabled && !serverKeyRaw && !organization.midtransServerKeyEnc) {
      return {
        ok: false,
        error:
          "Server Key Midtrans wajib diisi saat mengaktifkan pembayaran online",
      };
    }

    // Resolve the server key that will be active after save
    let effectiveServerKey = serverKeyRaw;
    if (!effectiveServerKey && organization.midtransServerKeyEnc) {
      try {
        effectiveServerKey = normalizeEnvLike(
          decryptSecret(organization.midtransServerKeyEnc),
        );
      } catch {
        return {
          ok: false,
          error:
            "Key lama tidak bisa dibaca. Tempel ulang Server Key dari dashboard Midtrans yang sesuai mode.",
        };
      }
    }

    if (midtransEnabled && effectiveServerKey) {
      const formatErr = invalidServerKey(effectiveServerKey);
      if (formatErr) return { ok: false, error: formatErr };
    }

    if (serverKeyRaw) {
      const formatErr = invalidServerKey(serverKeyRaw);
      if (formatErr) return { ok: false, error: formatErr };
    }

    if (clientKeyRaw) {
      const formatErr = invalidClientKey(clientKeyRaw);
      if (formatErr) return { ok: false, error: formatErr };
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

    if (serverKeyRaw) {
      data.midtransServerKeyEnc = encryptSecret(serverKeyRaw);
    }
    if (clientKeyRaw) {
      data.midtransClientKeyEnc = encryptSecret(clientKeyRaw);
    }

    await db.organization.update({
      where: { id: organizationId },
      data,
    });

    revalidatePath("/settings");
    revalidatePath("/invoices");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Gagal menyimpan Midtrans",
    };
  }
}
