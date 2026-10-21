"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";
import {
  decryptSecret,
  encryptSecret,
  normalizeEnvLike,
} from "@/lib/crypto/secrets";

export type SettingsActionResult =
  | { ok: true }
  | { ok: false; error: string };

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

function keyModeError(serverKey: string, isProduction: boolean): string | null {
  const looksServer =
    serverKey.startsWith("Mid-server-") ||
    serverKey.startsWith("SB-Mid-server-");
  if (!looksServer) {
    return "Server Key tidak valid. Harus diawali Mid-server- atau SB-Mid-server-";
  }
  const isSandboxKey = serverKey.startsWith("SB-");
  if (isProduction && isSandboxKey) {
    return "Key Sandbox (SB-…) tidak cocok dengan mode Production. Matikan Production atau pakai key Production.";
  }
  if (!isProduction && !isSandboxKey) {
    return "Key Production tidak cocok dengan mode Sandbox. Untuk Sandbox, tempel Server Key dari dashboard.sandbox.midtrans.com (awalan SB-Mid-server-).";
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
            "Key lama tidak bisa dibaca. Tempel ulang Server Key Sandbox (SB-Mid-server-…).",
        };
      }
    }

    if (midtransEnabled && effectiveServerKey) {
      const modeErr = keyModeError(effectiveServerKey, midtransIsProduction);
      if (modeErr) {
        return { ok: false, error: modeErr };
      }
    }

    if (serverKeyRaw) {
      const modeErr = keyModeError(serverKeyRaw, midtransIsProduction);
      if (modeErr) return { ok: false, error: modeErr };
    }

    if (clientKeyRaw) {
      const looksClient =
        clientKeyRaw.startsWith("Mid-client-") ||
        clientKeyRaw.startsWith("SB-Mid-client-");
      if (!looksClient) {
        return {
          ok: false,
          error:
            "Client Key tidak valid. Harus diawali Mid-client- atau SB-Mid-client-",
        };
      }
      const clientIsSandbox = clientKeyRaw.startsWith("SB-");
      if (clientIsSandbox === midtransIsProduction) {
        return {
          ok: false,
          error:
            "Client Key harus dari environment yang sama (Sandbox pakai SB-…, Production tanpa SB-).",
        };
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
