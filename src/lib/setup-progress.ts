import { db } from "@/lib/db";

export type SetupStepId =
  | "org"
  | "rooms"
  | "tenants"
  | "leases"
  | "invoices";

export type SetupStep = {
  id: SetupStepId;
  title: string;
  description: string;
  href: string;
  cta: string;
  done: boolean;
};

export type SetupProgress = {
  steps: SetupStep[];
  next: SetupStep | null;
  complete: boolean;
  doneCount: number;
  total: number;
  counts: {
    properties: number;
    rooms: number;
    tenants: number;
    leases: number;
    invoices: number;
  };
  firstPropertyId: string | null;
};

/** Progress setup pemilik baru: kamar → penyewa → check-in → tagihan. */
export async function getSetupProgress(
  organizationId: string,
): Promise<SetupProgress> {
  const [
    properties,
    firstProperty,
    rooms,
    tenants,
    leases,
    invoices,
  ] = await Promise.all([
    db.property.count({ where: { organizationId } }),
    db.property.findFirst({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    }),
    db.room.count({ where: { property: { organizationId } } }),
    db.tenant.count({ where: { organizationId } }),
    db.lease.count({
      where: {
        organizationId,
        status: { in: ["ACTIVE", "PENDING"] },
      },
    }),
    db.invoice.count({ where: { organizationId } }),
  ]);

  const roomsHref = firstProperty
    ? `/properties/${firstProperty.id}`
    : "/properties";

  const steps: SetupStep[] = [
    {
      id: "org",
      title: "Buat bisnis & kos",
      description: "Organisasi dan properti pertama sudah siap.",
      href: "/properties",
      cta: "Lihat properti",
      done: properties > 0,
    },
    {
      id: "rooms",
      title: "Tambah kamar pertama",
      description: "Isi kode kamar dan harga sewa bulanan.",
      href: roomsHref,
      cta: "Tambah kamar",
      done: rooms > 0,
    },
    {
      id: "tenants",
      title: "Daftarkan penyewa",
      description: "Simpan nama dan nomor WhatsApp penyewa.",
      href: "/tenants",
      cta: "Tambah penyewa",
      done: tenants > 0,
    },
    {
      id: "leases",
      title: "Check-in ke kamar",
      description: "Hubungkan penyewa dengan kamar kosong.",
      href: "/leases",
      cta: "Check-in",
      done: leases > 0,
    },
    {
      id: "invoices",
      title: "Buat tagihan pertama",
      description: "Generate tagihan lalu catat bayar atau kirim WhatsApp.",
      href: "/invoices",
      cta: "Ke tagihan",
      done: invoices > 0,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done) ?? null;

  return {
    steps,
    next,
    complete: next === null,
    doneCount,
    total: steps.length,
    counts: { properties, rooms, tenants, leases, invoices },
    firstPropertyId: firstProperty?.id ?? null,
  };
}
