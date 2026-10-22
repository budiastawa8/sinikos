import Link from "next/link";
import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";
import { loadEntitlements } from "@/lib/billing/entitlements";
import {
  LIMIT_REACHED_COPY,
  PLAN_FEATURES,
  PRO_PLUS_PRICES,
  PRO_PRICES,
  planLabel,
  type LimitReachedKey,
} from "@/lib/billing/plans";
import {
  getPlatformMidtransStatus,
  subscriptionNotifyUrl,
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
  const { organizationId, role } = await requireOrg();
  const isOwner = role === "OWNER";

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

  const activeLabel = planLabel(entitlements.code);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Langganan
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Gratis untuk mulai, Pro untuk bayar sewa + WA, Pro+ untuk tim dan
          laporan. Uang langganan masuk ke Midtrans platform SiniKos, terpisah
          dari uang sewa.{" "}
          <Link
            href="/panduan#langganan"
            className="font-medium text-primary underline"
          >
            Baca panduan paket.
          </Link>
        </p>
      </div>

      {limitMessage && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {limitMessage}
        </div>
      )}

      {!isOwner && (
        <p className="rounded-lg border bg-muted/50 px-4 py-3 text-sm">
          Hanya owner yang dapat membeli atau memperpanjang langganan.
        </p>
      )}

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle>Paket aktif</CardTitle>
            <CardDescription>
              {entitlements.active && entitlements.expiresAt
                ? `${activeLabel} berlaku sampai ${formatDate(entitlements.expiresAt)}.`
                : fresh.plan !== "FREE" && fresh.planExpiresAt
                  ? `Masa ${planLabel(fresh.plan)} berakhir pada ${formatDate(fresh.planExpiresAt)}. Paket yang berlaku sekarang: Gratis.`
                  : "Anda di paket Gratis. Data yang sudah ada tetap bisa dikelola."}
            </CardDescription>
          </div>
          <Badge variant={entitlements.active ? "success" : "secondary"}>
            {activeLabel}
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
          <UsageRow
            label="Staf"
            value={
              entitlements.limits.maxStaff > 0
                ? `${entitlements.usage.staff} dari ${entitlements.limits.maxStaff}`
                : `${entitlements.usage.staff} · Pro+ untuk menambah`
            }
            full={
              entitlements.limits.maxStaff > 0 &&
              entitlements.usage.staff >= entitlements.limits.maxStaff
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

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className={!entitlements.active ? "border-primary" : undefined}>
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

        <Card
          className={
            entitlements.code === "PRO" ? "border-primary" : undefined
          }
        >
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Pro</CardTitle>
              {entitlements.code === "PRO" && (
                <Badge variant="success">Paket Anda</Badge>
              )}
            </div>
            <CardDescription>
              {formatRupiah(PRO_PRICES.MONTHLY)} / bulan, atau{" "}
              {formatRupiah(PRO_PRICES.YEARLY)} / tahun.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              {PLAN_FEATURES.PRO.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            {isOwner && (
              <>
                <SubscribeButton
                  plan="PRO"
                  period="MONTHLY"
                  label={
                    entitlements.code === "PRO"
                      ? `Perpanjang ${formatRupiah(PRO_PRICES.MONTHLY)}`
                      : `Bayar ${formatRupiah(PRO_PRICES.MONTHLY)} / bulan`
                  }
                  disabled={!platform.configured}
                  variant={
                    entitlements.code === "PRO_PLUS" ? "outline" : "default"
                  }
                />
                <SubscribeButton
                  plan="PRO"
                  period="YEARLY"
                  variant="outline"
                  label={`Tahunan ${formatRupiah(PRO_PRICES.YEARLY)}`}
                  disabled={!platform.configured}
                />
              </>
            )}
          </CardContent>
        </Card>

        <Card
          className={
            entitlements.code === "PRO_PLUS" ? "border-primary" : undefined
          }
        >
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Pro+</CardTitle>
              {entitlements.code === "PRO_PLUS" && (
                <Badge variant="success">Paket Anda</Badge>
              )}
            </div>
            <CardDescription>
              {formatRupiah(PRO_PLUS_PRICES.MONTHLY)} / bulan, atau{" "}
              {formatRupiah(PRO_PLUS_PRICES.YEARLY)} / tahun.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              {PLAN_FEATURES.PRO_PLUS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            {isOwner && (
              <>
                <SubscribeButton
                  plan="PRO_PLUS"
                  period="MONTHLY"
                  label={
                    entitlements.code === "PRO_PLUS"
                      ? `Perpanjang ${formatRupiah(PRO_PLUS_PRICES.MONTHLY)}`
                      : entitlements.code === "PRO"
                        ? `Upgrade ${formatRupiah(PRO_PLUS_PRICES.MONTHLY)} / bulan`
                        : `Bayar ${formatRupiah(PRO_PLUS_PRICES.MONTHLY)} / bulan`
                  }
                  disabled={!platform.configured}
                />
                <SubscribeButton
                  plan="PRO_PLUS"
                  period="YEARLY"
                  variant="outline"
                  label={`Tahunan ${formatRupiah(PRO_PLUS_PRICES.YEARLY)}`}
                  disabled={!platform.configured}
                />
              </>
            )}
            {!platform.configured && isOwner && (
              <p className="text-sm text-muted-foreground">
                {platform.message ??
                  "Tombol bayar aktif setelah PLATFORM_MIDTRANS_SERVER_KEY diisi di environment Vercel."}
              </p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild variant="outline" className="h-11 w-full">
                <Link href="/staff">Kelola tim</Link>
              </Button>
              <Button asChild variant="outline" className="h-11 w-full">
                <Link href="/laporan">Lihat laporan</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat pembayaran</CardTitle>
          <CardDescription>
            Jika status masih menunggu setelah bayar, tekan Cek status bayar
            (webhook kadang terlambat).
          </CardDescription>
        </CardHeader>
        <CardContent className="-mx-2 overflow-x-auto sm:mx-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Paket</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    Belum ada pembayaran langganan.
                  </TableCell>
                </TableRow>
              ) : (
                history.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{formatDate(row.createdAt)}</TableCell>
                    <TableCell>{planLabel(row.plan)}</TableCell>
                    <TableCell>
                      {PERIOD_LABEL[row.period] ?? row.period}
                    </TableCell>
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
                      {row.status === "PENDING" &&
                      row.midtransOrderId &&
                      isOwner ? (
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

      {isOwner && (
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
                Sandbox tidak memotong uang sungguhan. Selesaikan VA di
                simulator Midtrans, lalu kembali ke halaman ini.
              </p>
            )}
            <p className="break-all rounded-md bg-muted px-3 py-3">
              {notifyUrl}
            </p>
            <Button asChild variant="outline" className="h-11 w-full sm:w-auto">
              <Link href="/settings">Pengaturan Midtrans sewa</Link>
            </Button>
          </CardContent>
        </Card>
      )}
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
      <span
        className={full ? "font-medium text-amber-800" : "text-muted-foreground"}
      >
        {value}
      </span>
    </div>
  );
}
