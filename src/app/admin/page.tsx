import { requirePlatformAdmin } from "@/lib/platform-admin";
import { getPlatformMetrics } from "@/lib/platform-metrics";
import { AdminOrgTable } from "@/components/admin-org-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function StatCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl tabular-nums sm:text-3xl">
          {value}
        </CardTitle>
      </CardHeader>
      {hint ? (
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">{hint}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}

export default async function AdminPage() {
  await requirePlatformAdmin();
  const metrics = await getPlatformMetrics();
  const { totals } = metrics;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Ringkasan</h2>
        <p className="text-sm text-muted-foreground">
          Metrik lintas semua organisasi SiniKos.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          title="Organisasi"
          value={String(totals.organizations)}
          hint={`+${totals.newOrgs7d} / 7 hari · +${totals.newOrgs30d} / 30 hari`}
        />
        <StatCard title="Pemilik (OWNER)" value={String(totals.owners)} />
        <StatCard title="Total kos" value={String(totals.properties)} />
        <StatCard title="Total kamar" value={String(totals.rooms)} />
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard title="Gratis aktif" value={String(totals.free)} />
        <StatCard title="Pro aktif" value={String(totals.pro)} />
        <StatCard title="Pro+ aktif" value={String(totals.proPlus)} />
      </div>

      <AdminOrgTable organizations={metrics.organizations} />
    </div>
  );
}
