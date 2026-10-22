"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/tenant";
import { formatDate } from "@/lib/utils";
import {
  createSubscriptionPayment,
  syncSubscriptionPayment,
} from "@/lib/payments/platform-midtrans";

const periodSchema = z.enum(["MONTHLY", "YEARLY"]);
const planSchema = z.enum(["PRO", "PRO_PLUS"]);

export async function startSubscriptionCheckoutAction(
  periodRaw: string,
  planRaw = "PRO",
) {
  const period = periodSchema.safeParse(periodRaw);
  const plan = planSchema.safeParse(planRaw);
  if (!period.success || !plan.success) {
    return { ok: false as const, error: "Paket atau periode tidak valid" };
  }

  const { organizationId, session } = await requireOwner();
  const result = await createSubscriptionPayment({
    organizationId,
    period: period.data,
    plan: plan.data,
    customerName: session.user.name || "Pemilik kos",
    customerEmail: session.user.email ?? undefined,
  });

  if (!result.ok) return result;
  revalidatePath("/billing");
  return { ok: true as const, url: result.url };
}

export async function syncSubscriptionAction(subscriptionId: string) {
  const { organizationId } = await requireOwner();
  const result = await syncSubscriptionPayment(subscriptionId, organizationId);
  revalidatePath("/billing");
  revalidatePath("/dashboard");
  revalidatePath("/invoices");
  revalidatePath("/settings");
  revalidatePath("/staff");
  revalidatePath("/laporan");

  if (!result.ok) return result;

  if ("endsAt" in result && result.endsAt) {
    return {
      ok: true as const,
      message: `Langganan aktif sampai ${formatDate(result.endsAt)}.`,
    };
  }

  return {
    ok: true as const,
    message: result.message ?? "Status langganan diperbarui.",
  };
}
