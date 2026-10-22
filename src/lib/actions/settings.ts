"use server";

import { revalidatePath } from "next/cache";
import { BillingCycle } from "@prisma/client";
import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";
import { isProActive } from "@/lib/billing/plans";
import {
  decryptSecret,
  encryptSecret,
  normalizeEnvLike,
} from "@/lib/crypto/secrets";
import { validateMidtransKeyMode } from "@/lib/payments/midtrans-keys";

export type SettingsActionResult =
  | { ok: true }
  | { ok: false; error: string };

const BILLING_CYCLES = new Set<string>([
  BillingCycle.CALENDAR_PRORATA,
  BillingCycle.ANNIVERSARY,
]);

export async function updateSettingsAction(formData: FormData) {
  const { organizationId, organization } = await requireOrg();
  const name = String(formData.get("name") ?? "").trim();
  const billingCycleRaw = String(formData.get("billingCycle") ?? "");
  const billingDay = Number(formData.get("billingDay"));
  const reminderDaysBefore = Number(formData.get("reminderDaysBefore"));
  const whatsappEnabled = formData.get("whatsappEnabled") === "on";
  const whatsappPayInfo = String(formData.get("whatsappPayInfo") ?? "").trim();

  if (name.length < 2) throw new Error("Nama bisnis wajib");
  if (!BILLING_CYCLES.has(billingCycleRaw)) {
    throw new Error("Siklus tagihan tidak valid");
  }
  const billingCycle = billingCycleRaw as BillingCycle;
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
      billingCycle,
      billingDay,
      reminderDaysBefore,
      whatsappEnabled: isProActive(organization) && whatsappEnabled,
      whatsappPayInfo:
        whatsappPayInfo ||
        "Silakan transfer ke rekening yang tertera / hubungi pengelola.",
    },
  });

  revalidatePath("/settings");
  revalidatePath("/leases");
  revalidatePath("/dashboard");
}

export async function updateMidtransSettingsAction(
  formData: FormData,
): Promise<SettingsActionResult> {
  try {
    const { organizationId, organization } = await requireOrg();

    const midtransEnabled = formData.get("midtransEnabled") === "on";
    const midtransIsProduction =
      formData.get("midtransIsProduction") === "on";
    const acknowledgeProduction =
      formData.get("acknowledgeProduction") === "on";
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

    if (
      midtransIsProduction &&
      midtransEnabled &&
      !organization.midtransIsProduction &&
      !acknowledgeProduction
    ) {
      return {
        ok: false,
        error:
          "Centang konfirmasi Production: Anda paham ini memakai uang sungguhan dan sudah uji Sandbox.",
      };
    }

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

    let effectiveClientKey = clientKeyRaw;
    if (!effectiveClientKey && organization.midtransClientKeyEnc) {
      try {
        effectiveClientKey = normalizeEnvLike(
          decryptSecret(organization.midtransClientKeyEnc),
        );
      } catch {
        effectiveClientKey = "";
      }
    }

    const modeErr = validateMidtransKeyMode({
      isProduction: midtransIsProduction,
      serverKey: effectiveServerKey || serverKeyRaw || null,
      clientKey: effectiveClientKey || clientKeyRaw || null,
    });
    if (modeErr) return { ok: false, error: modeErr };

    if (
      midtransIsProduction &&
      midtransEnabled &&
      !serverKeyRaw &&
      organization.midtransServerKeyEnc &&
      !organization.midtransIsProduction
    ) {
      return {
        ok: false,
        error:
          "Saat pindah ke Production, tempel ulang Server Key dari dashboard Production (jangan pakai key Sandbox tersimpan).",
      };
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
