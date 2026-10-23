import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";
import { loadEntitlements } from "@/lib/billing/entitlements";
import { canAdd } from "@/lib/billing/plans";
import { SetupNextHint } from "@/components/setup-next-hint";
import { LeaseList } from "@/components/lease-list";
import {
  LeaseCheckInCard,
  LeaseCheckInSheetTrigger,
} from "@/components/lease-checkin-panel";
import Link from "next/link";

export default async function LeasesPage() {
  const { organizationId, organization } = await requireOrg();
  const entitlements = await loadEntitlements(organization);
  const atLeaseLimit = !canAdd(
    entitlements.usage.activeLeases,
    entitlements.limits.maxActiveLeases,
  );
  const isAnniversary = organization.billingCycle === "ANNIVERSARY";

  const [leases, busyRoomIds, tenants, totalRooms, firstProperty, openRooms] =
    await Promise.all([
      db.lease.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: 80,
        select: {
          id: true,
          monthlyRent: true,
          startDate: true,
          billingAnchorDay: true,
          status: true,
          tenant: { select: { name: true } },
          room: {
            select: {
              code: true,
              property: { select: { name: true } },
            },
          },
        },
      }),
      db.lease.findMany({
        where: {
          organizationId,
          status: { in: ["ACTIVE", "PENDING"] },
        },
        select: { roomId: true },
      }),
      db.tenant.findMany({
        where: { organizationId },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      db.room.count({ where: { property: { organizationId } } }),
      db.property.findFirst({
        where: { organizationId },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      }),
      // Parallel dengan busyRoomIds; filter di memori (hindari round-trip kedua).
      db.room.findMany({
        where: {
          property: { organizationId },
          status: { not: "MAINTENANCE" },
        },
        orderBy: [{ property: { name: "asc" } }, { code: "asc" }],
        select: {
          id: true,
          code: true,
          price: true,
          property: { select: { name: true } },
        },
      }),
    ]);

  const busyIds = new Set(busyRoomIds.map((r) => r.roomId));
  const rooms = openRooms.filter((r) => !busyIds.has(r.id));
  const busyRoomCount = busyIds.size;

  const addRoomsHref = firstProperty
    ? `/properties/${firstProperty.id}`
    : "/properties";

  const hasLeases = leases.length > 0;

  const usageLabel =
    !entitlements.active && entitlements.limits.maxActiveLeases != null
      ? `Paket Gratis: ${entitlements.usage.activeLeases} dari ${entitlements.limits.maxActiveLeases} kontrak (aktif + menunggu bayar)`
      : undefined;

  const checkInProps = {
    isAnniversary,
    atLeaseLimit,
    usageLabel,
    tenants,
    rooms: rooms.map((r) => ({
      id: r.id,
      code: r.code,
      price: r.price,
      propertyName: r.property.name,
    })),
    addRoomsHref,
    totalRooms,
    busyRoomCount,
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Kontrak
          </h1>
          {hasLeases && (
            <div className="xl:hidden">
              <LeaseCheckInSheetTrigger {...checkInProps} />
            </div>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          Check-in membuat tagihan pertama di muka. Kamar baru berstatus terisi
          setelah tagihan itu lunas.{" "}
          {isAnniversary
            ? "Siklus tagihan mengikuti tanggal masuk."
            : `Siklus kalender/prorata (tanggal serempak ${organization.billingDay}).`}{" "}
          <Link href="/settings" className="text-primary underline">
            Ubah di Pengaturan
          </Link>
          .
        </p>
      </div>

      {totalRooms === 0 && (
        <SetupNextHint
          title="Belum ada kamar"
          body="Tambah kamar di properti dulu, baru bisa check-in penyewa."
          href={addRoomsHref}
          cta="Tambah kamar"
        />
      )}
      {totalRooms > 0 && tenants.length === 0 && (
        <SetupNextHint
          title="Daftarkan penyewa dulu"
          body="Check-in membutuhkan data penyewa (nama + WhatsApp)."
          href="/tenants"
          cta="Ke penyewa"
        />
      )}
      {totalRooms > 0 &&
        tenants.length > 0 &&
        !hasLeases &&
        rooms.length === 0 && (
          <SetupNextHint
            title="Semua kamar sedang terpakai"
            body="Kamar yang terlihat kosong di Properti bisa masih menunggu pelunasan check-in. Lunasi/batalkan di Kontrak, check-out, atau tambah kamar baru."
            href="/leases"
            cta="Lihat kontrak"
          />
        )}
      {totalRooms > 0 &&
        tenants.length > 0 &&
        !hasLeases &&
        rooms.length > 0 && (
          <SetupNextHint
            title="Langkah berikutnya: check-in"
            body="Pilih penyewa dan kamar kosong di form Check-in baru di bawah. Tagihan pertama akan dibuat otomatis."
            href="#check-in"
            cta="Isi form check-in"
          />
        )}

      <div className="grid gap-6 xl:grid-cols-3">
        <LeaseList
          isAnniversary={isAnniversary}
          leases={leases.map((lease) => ({
            id: lease.id,
            monthlyRent: lease.monthlyRent,
            startDate: lease.startDate.toISOString(),
            billingAnchorDay: lease.billingAnchorDay,
            status: lease.status,
            tenantName: lease.tenant.name,
            propertyName: lease.room.property.name,
            roomCode: lease.room.code,
          }))}
        />

        <LeaseCheckInCard
          {...checkInProps}
          className={hasLeases ? "hidden xl:block" : undefined}
        />
      </div>
    </div>
  );
}
