import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";
import { loadEntitlements } from "@/lib/billing/entitlements";
import { canAdd } from "@/lib/billing/plans";
import { checkInAction, checkOutAction } from "@/lib/actions/leases";
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

export default async function LeasesPage() {
  const { organizationId, organization } = await requireOrg();
  const entitlements = await loadEntitlements(organization);
  const atLeaseLimit = !canAdd(
    entitlements.usage.activeLeases,
    entitlements.limits.maxActiveLeases,
  );

  const [leases, rooms, tenants] = await Promise.all([
    db.lease.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        tenant: true,
        room: { include: { property: true } },
      },
    }),
    db.room.findMany({
      where: {
        property: { organizationId },
        status: { in: ["AVAILABLE", "MAINTENANCE"] },
      },
      include: { property: true },
      orderBy: [{ property: { name: "asc" } }, { code: "asc" }],
    }),
    db.tenant.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Kontrak
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Check-in / check-out penyewa ke kamar.
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
                    <TableCell>{formatDate(lease.startDate)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={lease.status === "ACTIVE" ? "success" : "secondary"}
                      >
                        {lease.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {lease.status === "ACTIVE" && (
                        <form action={checkOutAction}>
                          <input type="hidden" name="leaseId" value={lease.id} />
                          <Button type="submit" size="sm" variant="outline">
                            Check-out
                          </Button>
                        </form>
                      )}
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
            {!entitlements.active &&
              entitlements.limits.maxActiveLeases != null && (
                <CardDescription>
                  Paket Gratis: {entitlements.usage.activeLeases} dari{" "}
                  {entitlements.limits.maxActiveLeases} kontrak aktif
                </CardDescription>
              )}
          </CardHeader>
          <CardContent>
            {atLeaseLimit ? (
              <PlanLimitNotice>
                Batas kontrak aktif paket Gratis sudah tercapai. Check-out
                tetap bisa dilakukan.
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
                  <Label htmlFor="startDate">Tanggal mulai</Label>
                  <Input id="startDate" name="startDate" type="date" required />
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
                  Check-in
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
