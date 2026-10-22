"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOrg } from "@/lib/tenant";
import { formatDate } from "@/lib/utils";
import {
  createSubscriptionPayment,
  syncSubscriptionPayment,
} from "@/lib/payments/platform-midtrans";

const periodSchema = z.enum(["MONTHLY", "YEARLY"]);

export async function startSubscriptionCheckoutAction(periodRaw: string) {
  const parsed = periodSchema.safeParse(periodRaw);
  if (!parsed.success) {
    return { ok: false as const, error: "Periode langganan tidak valid" };
  }

  const { organizationId, session } = await requireOrg();
  const result = await createSubscriptionPayment({
    organizationId,
    period: parsed.data,
    customerName: session.user.name || "Pemilik kos",
    customerEmail: session.user.email ?? undefined,
  });

  if (!result.ok) return result;
  revalidatePath("/billing");
  return { ok: true as const, url: result.url };
}

export async function syncSubscriptionAction(subscriptionId: string) {
  const { organizationId } = await requireOrg();
  const result = await syncSubscriptionPayment(subscriptionId, organizationId);
  revalidatePath("/billing");
  revalidatePath("/dashboard");
  revalidatePath("/invoices");
  revalidatePath("/settings");

  if (!result.ok) return result;

  if ("endsAt" in result && result.endsAt) {
    return {
      ok: true as const,
      message: `Paket Pro aktif sampai ${formatDate(result.endsAt)}.`,
    };
  }

  return {
    ok: true as const,
    message: result.message ?? "Status langganan diperbarui.",
  };
}
