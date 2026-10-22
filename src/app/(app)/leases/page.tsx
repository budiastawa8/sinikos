import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";
import { loadEntitlements } from "@/lib/billing/entitlements";
import { canAdd } from "@/lib/billing/plans";
import {
  cancelPendingLeaseAction,
  checkInAction,
  checkOutAction,
} from "@/lib/actions/leases";
import { leaseStatusLabel } from "@/lib/labels";
import { formatRupiah, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PlanLimitNotice } from "@/components/plan-limit-notice";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";

function leaseStatusBadge(status: string) {
  if (status === "ACTIVE") return "success" as const;
  if (status === "PENDING") return "warning" as const;
  return "secondary" as const;
}

export default async function LeasesPage() {
  const { organizationId, organization } = await requireOrg();
  const entitlements = await loadEntitlements(organization);
  const atLeaseLimit = !canAdd(
    entitlements.usage.activeLeases,
    entitlements.limits.maxActiveLeases,
  );
  const isAnniversary = organization.billingCycle === "ANNIVERSARY";

  const [leases, busyRoomIds, tenants] = await Promise.all([
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Kontrak
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Check-in membuat tagihan pertama di muka. Kamar baru{" "}
          <span className="font-medium text-foreground">OCCUPIED</span> setelah
          tagihan itu lunas.{" "}
          {isAnniversary
            ? "Siklus tagihan mengikuti tanggal masuk."
            : `Siklus kalender/prorata (tanggal serempak ${organization.billingDay}).`}{" "}
          <Link href="/settings" className="text-primary underline">
            Ubah di Pengaturan
          </Link>
          .
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Daftar kontrak</CardTitle>
            <CardDescription>{leases.length} kontrak</CardDescription>
          </CardHeader>
          <CardContent className="-mx-2 overflow-x-auto sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Penyewa</TableHead>
                  <TableHead>Kamar</TableHead>
                  <TableHead>Sewa</TableHead>
                  <TableHead>Mulai</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {leases.map((lease) => (
                  <TableRow key={lease.id}>
                    <TableCell>{lease.tenant.name}</TableCell>
                    <TableCell>
                      {lease.room.property.name} · {lease.room.code}
                    </TableCell>
                    <TableCell>{formatRupiah(lease.monthlyRent)}</TableCell>
                    <TableCell>
                      <div>{formatDate(lease.startDate)}</div>
                      {isAnniversary && (
                        <div className="text-xs text-muted-foreground">
                          Tiap tgl {lease.billingAnchorDay}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={leaseStatusBadge(lease.status)}>
                        {leaseStatusLabel(lease.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        {lease.status === "PENDING" && (
                          <>
                            <Button asChild size="sm" variant="default">
                              <Link href="/invoices">Lunasin tagihan</Link>
                            </Button>
                            <form action={cancelPendingLeaseAction}>
                              <input
                                type="hidden"
                                name="leaseId"
                                value={lease.id}
                              />
                              <Button type="submit" size="sm" variant="outline">
                                Batalkan
                              </Button>
                            </form>
                          </>
                        )}
                        {lease.status === "ACTIVE" && (
                          <form action={checkOutAction}>
                            <input
                              type="hidden"
                              name="leaseId"
                              value={lease.id}
                            />
                            <Button type="submit" size="sm" variant="outline">
                              Check-out
                            </Button>
                          </form>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
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
