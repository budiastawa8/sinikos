import Link from "next/link";
import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";
import { isProActive } from "@/lib/billing/plans";
import { getWhatsAppQuotaUsage } from "@/lib/billing/whatsapp-quota";
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

export default async function DashboardPage() {
  const { organizationId, organization } = await requireOrg();
  const pro = isProActive(organization);

  const [rooms, occupied, unpaid, overdue, recentInvoices, waQuota] =
    await Promise.all([
      db.room.count({ where: { property: { organizationId } } }),
      db.room.count({
        where: { property: { organizationId }, status: "OCCUPIED" },
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

  const available = rooms - occupied;

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
          <Button asChild variant="outline" className="h-11 w-full sm:w-auto">
            <Link href="/panduan">Panduan</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 w-full sm:w-auto">
            <Link href="/billing">{pro ? "Paket Pro" : "Upgrade ke Pro"}</Link>
          </Button>
        </div>
      </div>

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

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard title="Kamar terisi" value={`${occupied}/${rooms}`} />
        <StatCard title="Kamar kosong" value={String(available)} />
        <StatCard title="Tagihan belum lunas" value={String(unpaid + overdue)} />
        <StatCard
          title="Kuota WA bulan ini"
          value={`${waQuota.used}/${waQuota.limit}`}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Tagihan terbaru</CardTitle>
            <CardDescription>Pantau jatuh tempo dan status bayar</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
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
                    Belum ada tagihan. Generate dari menu Tagihan.
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
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
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
