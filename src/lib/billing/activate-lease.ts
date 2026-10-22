import { InvoiceStatus, LeaseStatus, RoomStatus } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Setelah tagihan pertama lunas: kontrak PENDING → ACTIVE, kamar → OCCUPIED.
 */
export async function activateLeaseIfFirstInvoicePaid(invoiceId: string) {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      lease: true,
    },
  });

  if (!invoice) return { activated: false as const };
  if (invoice.status !== InvoiceStatus.PAID) {
    return { activated: false as const };
  }
  if (invoice.lease.status !== LeaseStatus.PENDING) {
    return { activated: false as const };
  }

  await db.$transaction([
    db.lease.update({
      where: { id: invoice.leaseId },
      data: { status: LeaseStatus.ACTIVE },
    }),
    db.room.update({
      where: { id: invoice.lease.roomId },
      data: { status: RoomStatus.OCCUPIED },
    }),
  ]);

  return { activated: true as const, leaseId: invoice.leaseId };
}
