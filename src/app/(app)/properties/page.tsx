import Link from "next/link";
import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";
import { loadEntitlements } from "@/lib/billing/entitlements";
import { canAdd } from "@/lib/billing/plans";
import { PlanLimitNotice } from "@/components/plan-limit-notice";
import { PropertyCreateForm } from "@/components/property-create-form";
import { SetupNextHint } from "@/components/setup-next-hint";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function PropertiesPage() {
  const { organizationId, organization } = await requireOrg();
  const [entitlements, properties] = await Promise.all([
    loadEntitlements(organization),
    db.property.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        address: true,
        _count: { select: { rooms: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const atPropertyLimit = !canAdd(
    entitlements.usage.properties,
    entitlements.limits.maxProperties,
  );
  const totalRooms = properties.reduce((sum, p) => sum + p._count.rooms, 0);
  const firstWithoutRooms = properties.find((p) => p._count.rooms === 0);

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

      {properties.length === 0 && (
        <SetupNextHint
          title="Belum ada kos"
          body="Tambah properti terlebih dahulu, lalu isi kamar di dalamnya."
          href="#tambah-properti"
          cta="Isi form di bawah"
        />
      )}
      {properties.length > 0 && totalRooms === 0 && firstWithoutRooms && (
        <SetupNextHint
          title="Langkah berikutnya: tambah kamar"
          body="Tanpa kamar, Anda belum bisa check-in penyewa atau membuat tagihan. Buka kos Anda lalu isi kode kamar dan harga sewa."
          href={`/properties/${firstWithoutRooms.id}`}
          cta={`Buka ${firstWithoutRooms.name}`}
        />
      )}

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
                  {p._count.rooms === 0 ? " · belum ada kamar" : ""}
                </p>
              </Link>
            ))}
            {properties.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Belum ada properti. Pakai form di sebelah untuk menambah.
              </p>
            )}
          </CardContent>
        </Card>

        <Card id="tambah-properti">
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
              <PropertyCreateForm />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
