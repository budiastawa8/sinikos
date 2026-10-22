import Link from "next/link";
import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";
import { loadEntitlements } from "@/lib/billing/entitlements";
import {
  LIMIT_REACHED_COPY,
  PLAN_FEATURES,
  PRO_PRICES,
  type LimitReachedKey,
} from "@/lib/billing/plans";
import {
  getPlatformMidtransStatus,
  subscriptionNotifyUrl,
  syncPendingSubscriptions,
} from "@/lib/payments/platform-midtrans";
import { formatDate, formatRupiah } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { SubscribeButton } from "@/components/subscribe-button";
import { SyncSubscriptionButton } from "@/components/sync-subscription-button";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Menunggu",
  ACTIVE: "Lunas",
  EXPIRED: "Berakhir",
  CANCELED: "Batal",
};

const PERIOD_LABEL: Record<string, string> = {
  MONTHLY: "1 bulan",
  YEARLY: "12 bulan",
};

function usageText(current: number, max: number | null) {
  if (max == null) return `${current} · tanpa batas`;
  return `${current} dari ${max}`;
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ batas?: string }>;
}) {
  const { batas } = await searchParams;
  const { organizationId } = await requireOrg();
  await syncPendingSubscriptions(organizationId);

  const fresh = await db.organization.findUniqueOrThrow({
    where: { id: organizationId },
  });
  const entitlements = await loadEntitlements(fresh);
  const history = await db.subscription.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: 8,
  });
  const platform = getPlatformMidtransStatus();
  const notifyUrl = subscriptionNotifyUrl();
  const limitMessage =
    batas && batas in LIMIT_REACHED_COPY
      ? LIMIT_REACHED_COPY[batas as LimitReachedKey]
      : null;
  const overFreeQuota =
    !entitlements.active &&
    ((entitlements.limits.maxProperties != null &&
      entitlements.usage.properties > entitlements.limits.maxProperties) ||
      (entitlements.limits.maxRooms != null &&
        entitlements.usage.rooms > entitlements.limits.maxRooms) ||
      (entitlements.limits.maxActiveLeases != null &&
        entitlements.usage.activeLeases >
          entitlements.limits.maxActiveLeases));

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Langganan
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Paket Gratis untuk kos kecil. Pro membuka batas kamar, link bayar
          sewa (opsional), dan WhatsApp. Uang langganan masuk ke Midtrans
          platform SiniKos, terpisah dari uang sewa penyewa.{" "}
          <Link href="/panduan#langganan" className="font-medium text-primary underline">
            Baca panduan paket.
          </Link>
        </p>
      </div>

      {limitMessage && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {limitMessage}
        </div>
      )}

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle>Paket aktif</CardTitle>
            <CardDescription>
              {entitlements.active && entitlements.expiresAt
                ? `Pro berlaku sampai ${formatDate(entitlements.expiresAt)}.`
                : fresh.plan === "PRO" && fresh.planExpiresAt
                  ? `Masa Pro berakhir pada ${formatDate(fresh.planExpiresAt)}. Paket yang berlaku sekarang: Gratis.`
                  : "Anda di paket Gratis. Data yang sudah ada tetap bisa dikelola."}
            </CardDescription>
          </div>
          <Badge variant={entitlements.active ? "success" : "secondary"}>
            {entitlements.active ? "Pro" : "Gratis"}
          </Badge>
        </CardHeader>
        <CardContent className="divide-y">
          <UsageRow
            label="Properti"
            value={usageText(
              entitlements.usage.properties,
              entitlements.limits.maxProperties,
            )}
            full={
              entitlements.limits.maxProperties != null &&
              entitlements.usage.properties >= entitlements.limits.maxProperties
            }
          />
          <UsageRow
            label="Kamar"
            value={usageText(
              entitlements.usage.rooms,
              entitlements.limits.maxRooms,
            )}
            full={
              entitlements.limits.maxRooms != null &&
              entitlements.usage.rooms >= entitlements.limits.maxRooms
            }
          />
          <UsageRow
            label="Kontrak aktif"
            value={usageText(
              entitlements.usage.activeLeases,
              entitlements.limits.maxActiveLeases,
            )}
            full={
              entitlements.limits.maxActiveLeases != null &&
              entitlements.usage.activeLeases >=
                entitlements.limits.maxActiveLeases
            }
          />
          {overFreeQuota && (
            <p className="pt-3 text-sm text-amber-900">
              Jumlah saat ini melebihi batas Gratis. Data lama tetap ada;
              penambahan baru butuh Pro.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className={entitlements.active ? undefined : "border-primary"}>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Gratis</CardTitle>
              {!entitlements.active && <Badge>Paket Anda</Badge>}
            </div>
            <CardDescription>Rp 0</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {PLAN_FEATURES.FREE.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className={entitlements.active ? "border-primary" : undefined}>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Pro</CardTitle>
              {entitlements.active && <Badge variant="success">Paket Anda</Badge>}
            </div>
            <CardDescription>
              {formatRupiah(PRO_PRICES.MONTHLY)} / bulan, atau{" "}
              {formatRupiah(PRO_PRICES.YEARLY)} / tahun (hemat 2 bulan).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              {PLAN_FEATURES.PRO.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <SubscribeButton
              period="MONTHLY"
              label={
                entitlements.active
                  ? `Perpanjang ${formatRupiah(PRO_PRICES.MONTHLY)}`
                  : `Bayar ${formatRupiah(PRO_PRICES.MONTHLY)} / bulan`
              }
              disabled={!platform.configured}
            />
            <SubscribeButton
              period="YEARLY"
              label={
                entitlements.active
                  ? `Perpanjang ${formatRupiah(PRO_PRICES.YEARLY)} / tahun`
                  : `Bayar ${formatRupiah(PRO_PRICES.YEARLY)} / tahun`
              }
              disabled={!platform.configured}
            />
            {!platform.configured && (
              <p className="text-sm text-muted-foreground">
                {platform.message ??
                  "Tombol bayar aktif setelah PLATFORM_MIDTRANS_SERVER_KEY diisi di environment Vercel."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat pembayaran</CardTitle>
          <CardDescription>
            Langganan yang menunggu bisa dicek manual jika webhook belum masuk.
          </CardDescription>
        </CardHeader>
        <CardContent className="-mx-2 overflow-x-auto sm:mx-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    Belum ada pembayaran langganan.
                  </TableCell>
                </TableRow>
              ) : (
                history.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{formatDate(row.createdAt)}</TableCell>
                    <TableCell>{PERIOD_LABEL[row.period] ?? row.period}</TableCell>
                    <TableCell>{formatRupiah(row.amount)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          row.status === "ACTIVE"
                            ? "success"
                            : row.status === "PENDING"
                              ? "warning"
                              : "secondary"
                        }
                      >
                        {STATUS_LABEL[row.status] ?? row.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {row.status === "PENDING" && row.midtransOrderId ? (
                        <SyncSubscriptionButton subscriptionId={row.id} />
                      ) : row.endsAt ? (
                        <span className="text-sm text-muted-foreground">
                          sampai {formatDate(row.endsAt)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Midtrans platform</CardTitle>
          <CardDescription>
            Ini akun Midtrans SiniKos untuk langganan, bukan key di Pengaturan
            yang dipakai uang sewa. Di dashboard Midtrans platform, set
            Notification URL ke alamat di bawah.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Mode:{" "}
            <span className="font-medium">
              {platform.isProduction ? "Production" : "Sandbox"}
            </span>
            {platform.configured ? " · key terdeteksi" : " · key belum diisi"}
          </p>
          {platform.isProduction ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
              Mode Production memakai uang sungguhan. Uji dulu di Sandbox
              sebelum mengaktifkan flag ini.
            </p>
          ) : (
            <p className="text-muted-foreground">
              Sandbox tidak memotong uang sungguhan. Selesaikan VA di simulator
              Midtrans, lalu kembali ke halaman ini.
            </p>
          )}
          <p className="break-all rounded-md bg-muted px-3 py-3">{notifyUrl}</p>
          <Button asChild variant="outline" className="h-11 w-full sm:w-auto">
            <Link href="/settings">Pengaturan Midtrans sewa</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function UsageRow({
  label,
  value,
  full,
}: {
  label: string;
  value: string;
  full: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 text-sm">
      <span>{label}</span>
      <span className={full ? "font-medium text-amber-800" : "text-muted-foreground"}>
        {value}
      </span>
    </div>
  );
}
