import Link from "next/link";
import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";
import { isProActive } from "@/lib/billing/plans";
import { getWhatsAppQuotaUsage } from "@/lib/billing/whatsapp-quota";
import { getSetupProgress } from "@/lib/setup-progress";
import {
  invoiceStatusBadgeVariant,
  invoiceStatusLabel,
} from "@/lib/labels";
import { formatRupiah, formatDate } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PwaInstallHint } from "@/components/pwa-install-hint";
import { SetupChecklist } from "@/components/setup-checklist";

export default async function DashboardPage() {
  const { organizationId, organization } = await requireOrg();
  const pro = isProActive(organization);

  const [setup, occupied, busyRoomIds, unpaid, overdue, recentInvoices, waQuota] =
    await Promise.all([
      getSetupProgress(organizationId),
      // Terisi = benar-benar berkontrak aktif (bukan RoomStatus manual).
      db.lease.count({
        where: { organizationId, status: "ACTIVE" },
      }),
      db.lease.findMany({
        where: {
          organizationId,
          status: { in: ["ACTIVE", "PENDING"] },
        },
        select: { roomId: true },
        distinct: ["roomId"],
      }),
      db.invoice.count({
        where: {
          organizationId,
          status: { in: ["UNPAID", "PARTIAL"] },
        },
      }),
      db.invoice.count({
        where: { organizationId, status: "OVERDUE" },
      }),
      db.invoice.findMany({
        where: { organizationId },
        take: 8,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          amount: true,
          dueDate: true,
          status: true,
          lease: {
            select: {
              tenant: { select: { name: true } },
              room: { select: { code: true } },
            },
          },
        },
      }),
      getWhatsAppQuotaUsage(organizationId),
    ]);

  const rooms = setup.counts.rooms;
  const busyIds = busyRoomIds.map((r) => r.roomId);
  // Kosong = bisa check-in: tanpa kontrak aktif/pending, bukan perawatan.
  const available = await db.room.count({
    where: {
      property: { organizationId },
      status: { not: "MAINTENANCE" },
      ...(busyIds.length > 0 ? { id: { notIn: busyIds } } : {}),
    },
  });
  const next = setup.next;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Ringkasan {organization.name}
          </p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex">
          {next ? (
            <Button asChild className="h-11 w-full sm:w-auto">
              <Link href={next.href}>{next.cta}</Link>
            </Button>
          ) : (
            <Button asChild variant="outline" className="h-11 w-full sm:w-auto">
              <Link href="/invoices">Tagihan</Link>
            </Button>
          )}
          <Button asChild variant="outline" className="h-11 w-full sm:w-auto">
            <Link href="/panduan">Panduan</Link>
          </Button>
        </div>
      </div>

      <SetupChecklist progress={setup} />

      <PwaInstallHint />

      {waQuota.exhausted && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Kuota WhatsApp {waQuota.periodLabel} sudah habis ({waQuota.used}/
          {waQuota.limit}). Tagihan tetap bisa dicatat manual
          {!pro ? (
            <>
              .{" "}
              <Link href="/billing" className="font-medium underline">
                Upgrade ke Pro
              </Link>{" "}
              untuk kuota lebih besar.
            </>
          ) : (
            "; pengiriman otomatis lanjut bulan depan."
          )}
        </div>
      )}
      {!waQuota.exhausted && waQuota.nearLimit && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Kuota WhatsApp hampir habis: {waQuota.used}/{waQuota.limit} pesan di{" "}
          {waQuota.periodLabel}.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard title="Kamar terisi" value={`${occupied}/${rooms}`} />
        <StatCard title="Kamar kosong" value={String(available)} />
        <StatCard title="Tagihan belum lunas" value={String(unpaid + overdue)} />
        <StatCard
          title="Kuota WA bulan ini"
          value={`${waQuota.used}/${waQuota.limit}`}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Tagihan terbaru</CardTitle>
            <CardDescription>Pantau jatuh tempo dan status bayar</CardDescription>
          </div>
          <Button asChild variant="outline" className="h-11 w-full sm:h-9 sm:w-auto">
            <Link href="/invoices">Lihat semua</Link>
          </Button>
        </CardHeader>
        <CardContent className="-mx-2 overflow-x-auto sm:mx-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Penyewa</TableHead>
                <TableHead>Kamar</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead>Jatuh tempo</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    {next?.id === "invoices" ? (
                      <>
                        Belum ada tagihan.{" "}
                        <Link
                          href="/invoices"
                          className="font-medium text-primary underline"
                        >
                          Buat tagihan bulan ini
                        </Link>
                        .
                      </>
                    ) : next ? (
                      <>
                        Belum ada tagihan. Selesaikan dulu:{" "}
                        <Link
                          href={next.href}
                          className="font-medium text-primary underline"
                        >
                          {next.title}
                        </Link>
                        .
                      </>
                    ) : (
                      "Belum ada tagihan."
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                recentInvoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>{inv.lease.tenant.name}</TableCell>
                    <TableCell>{inv.lease.room.code}</TableCell>
                    <TableCell>{formatRupiah(inv.amount)}</TableCell>
                    <TableCell>{formatDate(inv.dueDate)}</TableCell>
                    <TableCell>
                      <StatusBadge status={inv.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="space-y-1 p-3 sm:p-6 sm:pb-2">
        <CardDescription className="text-xs sm:text-sm">{title}</CardDescription>
        <CardTitle className="text-xl leading-tight sm:text-3xl">
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={invoiceStatusBadgeVariant(status)}>
      {invoiceStatusLabel(status)}
    </Badge>
  );
}
