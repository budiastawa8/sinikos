import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";
import { loadEntitlements } from "@/lib/billing/entitlements";
import { canAdd } from "@/lib/billing/plans";
import { checkInAction } from "@/lib/actions/leases";
import { formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlanLimitNotice } from "@/components/plan-limit-notice";
import { SetupNextHint } from "@/components/setup-next-hint";
import { LeaseList } from "@/components/lease-list";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default async function LeasesPage() {
  const { organizationId, organization } = await requireOrg();
  const entitlements = await loadEntitlements(organization);
  const atLeaseLimit = !canAdd(
    entitlements.usage.activeLeases,
    entitlements.limits.maxActiveLeases,
  );
  const isAnniversary = organization.billingCycle === "ANNIVERSARY";

  const [leases, busyRoomIds, tenants, totalRooms, firstProperty] =
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
    ]);

  const busyIds = busyRoomIds.map((r) => r.roomId);
  const rooms = await db.room.findMany({
    where: {
      property: { organizationId },
      status: { in: ["AVAILABLE", "MAINTENANCE"] },
      ...(busyIds.length > 0 ? { id: { notIn: busyIds } } : {}),
    },
    orderBy: [{ property: { name: "asc" } }, { code: "asc" }],
    select: {
      id: true,
      code: true,
      price: true,
      property: { select: { name: true } },
    },
  });

  const addRoomsHref = firstProperty
    ? `/properties/${firstProperty.id}`
    : "/properties";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Kontrak
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
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
        leases.length === 0 &&
        rooms.length === 0 && (
          <SetupNextHint
            title="Semua kamar sedang terpakai"
            body="Tidak ada kamar kosong untuk check-in. Tambah kamar baru atau check-out penyewa yang sudah selesai."
            href={addRoomsHref}
            cta="Kelola kamar"
          />
        )}
      {totalRooms > 0 &&
        tenants.length > 0 &&
        leases.length === 0 &&
        rooms.length > 0 && (
          <SetupNextHint
            title="Langkah berikutnya: check-in"
            body="Pilih penyewa dan kamar kosong di form Check-in baru. Tagihan pertama akan dibuat otomatis."
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

        <Card id="check-in">
          <CardHeader>
            <CardTitle>Check-in baru</CardTitle>
            <CardDescription>
              {isAnniversary
                ? "Pilih tanggal masuk — tagihan penuh berulang di tanggal itu."
                : "Masuk di tengah bulan: prorata harian (hari masuk tidak dihitung), lalu serempak di tanggal tagihan."}{" "}
              Tagihan pertama wajib lunas sebelum kamar terisi.
            </CardDescription>
            {!entitlements.active &&
              entitlements.limits.maxActiveLeases != null && (
                <CardDescription>
                  Paket Gratis: {entitlements.usage.activeLeases} dari{" "}
                  {entitlements.limits.maxActiveLeases} kontrak (aktif + menunggu
                  bayar)
                </CardDescription>
              )}
          </CardHeader>
          <CardContent>
            {atLeaseLimit ? (
              <PlanLimitNotice>
                Batas kontrak paket Gratis sudah tercapai. Check-out atau
                batalkan check-in menunggu bayar dulu.
              </PlanLimitNotice>
            ) : (
              <form action={checkInAction} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tenantId">Penyewa</Label>
                  <select
                    id="tenantId"
                    name="tenantId"
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Pilih penyewa</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roomId">Kamar tersedia</Label>
                  <select
                    id="roomId"
                    name="roomId"
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Pilih kamar</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.property.name} · {r.code} ({formatRupiah(r.price)})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Tanggal masuk</Label>
                  <Input id="startDate" name="startDate" type="date" required />
                  {isAnniversary && (
                    <p className="text-xs text-muted-foreground">
                      Tanggal ini menjadi siklus tagihan bulanan (maks. hari ke-28
                      untuk bulan pendek).
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthlyRent">Sewa / bulan</Label>
                  <Input
                    id="monthlyRent"
                    name="monthlyRent"
                    type="number"
                    required
                    min={1}
                    placeholder="1500000"
                  />
                </div>
                <Button type="submit" className="h-11 w-full">
                  Buat check-in + tagihan
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
