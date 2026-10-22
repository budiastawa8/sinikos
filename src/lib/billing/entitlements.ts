import { redirect } from "next/navigation";
import type { PlanCode } from "@prisma/client";
import { db } from "@/lib/db";
import { canAdd, isProActive, limitsFor } from "@/lib/billing/plans";

export async function getUsage(organizationId: string) {
  const [properties, rooms, activeLeases] = await Promise.all([
    db.property.count({ where: { organizationId } }),
    db.room.count({ where: { property: { organizationId } } }),
    db.lease.count({ where: { organizationId, status: "ACTIVE" } }),
  ]);
  return { properties, rooms, activeLeases };
}

export async function loadEntitlements(org: {
  id: string;
  plan: PlanCode;
  planExpiresAt: Date | null;
}) {
  const active = isProActive(org);
  const usage = await getUsage(org.id);
  return {
    active,
    code: active ? ("PRO" as const) : ("FREE" as const),
    limits: limitsFor(active),
    usage,
    expiresAt: org.planExpiresAt,
  };
}

export async function assertCanAddProperty(org: {
  id: string;
  plan: PlanCode;
  planExpiresAt: Date | null;
}) {
  const entitlements = await loadEntitlements(org);
  if (
    !canAdd(entitlements.usage.properties, entitlements.limits.maxProperties)
  ) {
    redirect("/billing?batas=properti");
  }
}

export async function assertCanAddRoom(org: {
  id: string;
  plan: PlanCode;
  planExpiresAt: Date | null;
}) {
  const entitlements = await loadEntitlements(org);
  if (!canAdd(entitlements.usage.rooms, entitlements.limits.maxRooms)) {
    redirect("/billing?batas=kamar");
  }
}

export async function assertCanAddLease(org: {
  id: string;
  plan: PlanCode;
  planExpiresAt: Date | null;
}) {
  const entitlements = await loadEntitlements(org);
  if (
    !canAdd(
      entitlements.usage.activeLeases,
      entitlements.limits.maxActiveLeases,
    )
  ) {
    redirect("/billing?batas=kontrak");
  }
}

/** Turunkan organisasi yang masa Pro-nya sudah lewat. Dipanggil cron harian. */
export async function expireLapsedPlans(asOf = new Date()) {
  const lapsed = await db.organization.findMany({
    where: { plan: "PRO", planExpiresAt: { lt: asOf } },
    select: { id: true },
  });
  if (lapsed.length === 0) return { expired: 0 };

  const ids = lapsed.map((org) => org.id);
  await db.$transaction([
    db.organization.updateMany({
      where: { id: { in: ids } },
      data: { plan: "FREE", whatsappEnabled: false },
    }),
    db.subscription.updateMany({
      where: {
        organizationId: { in: ids },
        status: "ACTIVE",
        endsAt: { lt: asOf },
      },
      data: { status: "EXPIRED" },
    }),
  ]);

  return { expired: ids.length };
}
