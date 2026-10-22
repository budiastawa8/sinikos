import { db } from "@/lib/db";

export async function getArrearsReport(organizationId: string) {
  const invoices = await db.invoice.findMany({
    where: {
      organizationId,
      status: { in: ["UNPAID", "PARTIAL", "OVERDUE"] },
    },
    select: {
      id: true,
      periodYear: true,
      periodMonth: true,
      amount: true,
      amountPaid: true,
      dueDate: true,
      status: true,
      lease: {
        select: {
          tenant: { select: { name: true, phone: true } },
          room: {
            select: {
              code: true,
              property: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    take: 500,
  });

  const rows = invoices.map((inv) => {
    const outstanding = Math.max(0, inv.amount - inv.amountPaid);
    return {
      id: inv.id,
      tenantName: inv.lease.tenant.name,
      phone: inv.lease.tenant.phone,
      propertyName: inv.lease.room.property.name,
      roomCode: inv.lease.room.code,
      period: `${inv.periodMonth}/${inv.periodYear}`,
      amount: inv.amount,
      amountPaid: inv.amountPaid,
      outstanding,
      dueDate: inv.dueDate,
      status: inv.status,
    };
  });

  const totalOutstanding = rows.reduce((sum, r) => sum + r.outstanding, 0);
  return { rows, totalOutstanding, count: rows.length };
}

export async function getOccupancyReport(organizationId: string) {
  const rooms = await db.room.findMany({
    where: { property: { organizationId } },
    select: {
      id: true,
      code: true,
      status: true,
      price: true,
      property: { select: { name: true } },
      leases: {
        where: { status: { in: ["ACTIVE", "PENDING"] } },
        select: {
          status: true,
          tenant: { select: { name: true } },
        },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: [{ property: { name: "asc" } }, { code: "asc" }],
    take: 1000,
  });

  const rows = rooms.map((room) => {
    const lease = room.leases[0];
    return {
      id: room.id,
      propertyName: room.property.name,
      roomCode: room.code,
      status: room.status,
      price: room.price,
      tenantName: lease?.tenant.name ?? null,
      leaseStatus: lease?.status ?? null,
    };
  });

  const summary = {
    total: rows.length,
    available: rows.filter((r) => r.status === "AVAILABLE").length,
    occupied: rows.filter((r) => r.status === "OCCUPIED").length,
    maintenance: rows.filter((r) => r.status === "MAINTENANCE").length,
    pendingCheckIn: rows.filter((r) => r.leaseStatus === "PENDING").length,
  };

  const occupancyRate =
    summary.total === 0
      ? 0
      : Math.round((summary.occupied / summary.total) * 100);

  return { rows, summary, occupancyRate };
}
