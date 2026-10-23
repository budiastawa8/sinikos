import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";
import { SetupNextHint } from "@/components/setup-next-hint";
import { TenantList } from "@/components/tenant-list";
import {
  TenantCreateCard,
  TenantCreateSheetTrigger,
} from "@/components/tenant-create-panel";

export default async function TenantsPage() {
  const { organizationId } = await requireOrg();
  const [tenants, roomCount, firstProperty] = await Promise.all([
    db.tenant.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        name: true,
        phone: true,
        leases: {
          where: { status: "ACTIVE" },
          take: 1,
          select: { room: { select: { code: true } } },
        },
      },
    }),
    db.room.count({ where: { property: { organizationId } } }),
    db.property.findFirst({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    }),
  ]);

  const hasTenants = tenants.length > 0;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Penyewa
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Data penyewa dan nomor WhatsApp untuk tagihan.
          </p>
        </div>
        {hasTenants && (
          <div className="xl:hidden">
            <TenantCreateSheetTrigger />
          </div>
        )}
      </div>

      {roomCount === 0 && (
        <SetupNextHint
          title="Tambah kamar dulu"
          body="Sebelum mendaftarkan penyewa, isi kamar di properti Anda agar nanti bisa check-in."
          href={firstProperty ? `/properties/${firstProperty.id}` : "/properties"}
          cta="Ke properti / kamar"
        />
      )}
      {roomCount > 0 && !hasTenants && (
        <SetupNextHint
          title="Langkah berikutnya: daftar penyewa"
          body="Simpan nama dan nomor WhatsApp di form di bawah. Setelah itu Anda bisa check-in ke kamar kosong."
          href="#tambah-penyewa"
          cta="Isi form di bawah"
        />
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <TenantList
          tenants={tenants.map((t) => ({
            id: t.id,
            name: t.name,
            phone: t.phone,
            roomCode: t.leases[0]?.room.code ?? null,
          }))}
        />

        <TenantCreateCard
          className={hasTenants ? "hidden xl:block" : undefined}
        />
      </div>
    </div>
  );
}
