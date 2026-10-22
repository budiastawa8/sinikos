import Link from "next/link";
import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";
import { loadEntitlements } from "@/lib/billing/entitlements";
import { canAdd } from "@/lib/billing/plans";
import { createPropertyAction } from "@/lib/actions/properties";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlanLimitNotice } from "@/components/plan-limit-notice";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function PropertiesPage() {
  const { organizationId, organization } = await requireOrg();
  const entitlements = await loadEntitlements(organization);
  const atPropertyLimit = !canAdd(
    entitlements.usage.properties,
    entitlements.limits.maxProperties,
  );
  const properties = await db.property.findMany({
    where: { organizationId },
    include: { _count: { select: { rooms: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Properti
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Kelola lokasi kos dan jumlah kamarnya.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daftar properti</CardTitle>
            <CardDescription>{properties.length} properti terdaftar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {properties.map((p) => (
              <Link
                key={p.id}
                href={`/properties/${p.id}`}
                className="block rounded-lg border px-4 py-3 transition-colors hover:bg-accent"
              >
                <p className="font-medium">{p.name}</p>
                <p className="text-sm text-muted-foreground">
                  {p._count.rooms} kamar · {p.address || "Tanpa alamat"}
                </p>
              </Link>
            ))}
            {properties.length === 0 && (
              <p className="text-sm text-muted-foreground">Belum ada properti.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tambah properti</CardTitle>
            {!entitlements.active && entitlements.limits.maxProperties != null && (
              <CardDescription>
                Paket Gratis: {entitlements.usage.properties} dari{" "}
                {entitlements.limits.maxProperties} properti
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {atPropertyLimit ? (
              <PlanLimitNotice>
                Batas properti paket Gratis sudah tercapai. Data kos yang ada
                tetap bisa dikelola.
              </PlanLimitNotice>
            ) : (
              <form action={createPropertyAction} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama kos</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Alamat</Label>
                  <Input id="address" name="address" />
                </div>
                <Button type="submit" className="h-11 w-full sm:w-auto">
                  Simpan
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
