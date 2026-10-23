import { db } from "@/lib/db";
import { activePlanCode, planLabel } from "@/lib/billing/plans";

export type PlatformOrgRow = {
  id: string;
  name: string;
  planStored: string;
  planActive: string;
  planLabel: string;
  planExpiresAt: string | null;
  createdAt: string;
  ownerName: string | null;
  ownerEmail: string | null;
  propertyCount: number;
  roomCount: number;
};

export type PlatformMetrics = {
  totals: {
    organizations: number;
    owners: number;
    properties: number;
    rooms: number;
    free: number;
    pro: number;
    proPlus: number;
    newOrgs7d: number;
    newOrgs30d: number;
  };
  organizations: PlatformOrgRow[];
};

export async function getPlatformMetrics(): Promise<PlatformMetrics> {
  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [orgs, allPlanRows, ownerCount, propertyCount, roomCount, newOrgs7d, newOrgs30d] =
    await Promise.all([
      db.organization.findMany({
        orderBy: { createdAt: "desc" },
        take: 300,
        select: {
          id: true,
          name: true,
          plan: true,
          planExpiresAt: true,
          createdAt: true,
          memberships: {
            where: { role: "OWNER" },
            take: 1,
            orderBy: { createdAt: "asc" },
            select: {
              user: { select: { name: true, email: true } },
            },
          },
          properties: {
            select: { _count: { select: { rooms: true } } },
          },
        },
      }),
      db.organization.findMany({
        select: { plan: true, planExpiresAt: true },
      }),
      db.membership.count({ where: { role: "OWNER" } }),
      db.property.count(),
      db.room.count(),
      db.organization.count({ where: { createdAt: { gte: d7 } } }),
      db.organization.count({ where: { createdAt: { gte: d30 } } }),
    ]);

  let free = 0;
  let pro = 0;
  let proPlus = 0;
  for (const org of allPlanRows) {
    const code = activePlanCode(org, now);
    if (code === "PRO_PLUS") proPlus += 1;
    else if (code === "PRO") pro += 1;
    else free += 1;
  }

  const organizations: PlatformOrgRow[] = orgs.map((org) => {
    const code = activePlanCode(org, now);
    const owner = org.memberships[0]?.user ?? null;
    return {
      id: org.id,
      name: org.name,
      planStored: org.plan,
      planActive: code,
      planLabel: planLabel(code),
      planExpiresAt: org.planExpiresAt?.toISOString() ?? null,
      createdAt: org.createdAt.toISOString(),
      ownerName: owner?.name ?? null,
      ownerEmail: owner?.email ?? null,
      propertyCount: org.properties.length,
      roomCount: org.properties.reduce((sum, p) => sum + p._count.rooms, 0),
    };
  });

  return {
    totals: {
      organizations: allPlanRows.length,
      owners: ownerCount,
      properties: propertyCount,
      rooms: roomCount,
      free,
      pro,
      proPlus,
      newOrgs7d,
      newOrgs30d,
    },
    organizations,
  };
}
