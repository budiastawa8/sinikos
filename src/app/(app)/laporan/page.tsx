import Link from "next/link";
import { requireOrg } from "@/lib/tenant";
import { assertCanViewReports } from "@/lib/billing/entitlements";
import {
  getArrearsReport,
  getOccupancyReport,
} from "@/lib/reports/summary";
import {
  invoiceStatusLabel,
  leaseStatusLabel,
  roomStatusLabel,
} from "@/lib/labels";
import { formatDate, formatRupiah } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
import { ExportCsvButton } from "@/components/export-csv-button";

function statusLabel(code: string) {
  const invoice = invoiceStatusLabel(code);
  if (invoice !== code) return invoice;
  const room = roomStatusLabel(code);
  if (room !== code) return room;
  return leaseStatusLabel(code);
}

export default async function ReportsPage() {
  const { organization } = await requireOrg();
  await assertCanViewReports(organization);

  const [arrears, occupancy] = await Promise.all([
    getArrearsReport(organization.id),
    getOccupancyReport(organization.id),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Laporan
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Tunggakan sewa dan okupansi kamar. Fitur paket Pro+.{" "}
          <Link href="/panduan#langganan" className="font-medium text-primary underline">
            Tentang paket
          </Link>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          title="Tunggakan"
          value={formatRupiah(arrears.totalOutstanding)}
          hint={`${arrears.count} tagihan`}
        />
        <Stat
          title="Okupansi"
          value={`${occupancy.occupancyRate}%`}
          hint={`${occupancy.summary.occupied}/${occupancy.summary.total} kamar`}
        />
        <Stat
          title="Kamar kosong"
          value={String(occupancy.summary.available)}
        />
        <Stat
          title="Menunggu bayar"
          value={String(occupancy.summary.pendingCheckIn)}
        />
      </div>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle>Tunggakan</CardTitle>
            <CardDescription>
              Tagihan belum lunas, sebagian, atau terlambat.
            </CardDescription>
          </div>
          <ExportCsvButton
            filename={`tunggakan-sinikos.csv`}
            headers={[
              "Penyewa",
              "Telepon",
              "Properti",
              "Kamar",
              "Periode",
              "Jumlah",
              "Dibayar",
              "Sisa",
              "Jatuh tempo",
              "Status",
            ]}
            rows={arrears.rows.map((r) => [
              r.tenantName,
              r.phone,
              r.propertyName,
              r.roomCode,
              r.period,
              r.amount,
              r.amountPaid,
              r.outstanding,
              formatDate(r.dueDate),
              statusLabel(r.status),
            ])}
          />
        </CardHeader>
        <CardContent className="-mx-2 overflow-x-auto sm:mx-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Penyewa</TableHead>
                <TableHead>Kamar</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>Sisa</TableHead>
                <TableHead>Jatuh tempo</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {arrears.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    Tidak ada tunggakan.
                  </TableCell>
                </TableRow>
              ) : (
                arrears.rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.tenantName}</TableCell>
                    <TableCell>
                      {r.propertyName} · {r.roomCode}
                    </TableCell>
                    <TableCell>{r.period}</TableCell>
                    <TableCell>{formatRupiah(r.outstanding)}</TableCell>
                    <TableCell>{formatDate(r.dueDate)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          r.status === "OVERDUE" ? "warning" : "secondary"
                        }
                      >
                        {statusLabel(r.status)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle>Okupansi kamar</CardTitle>
            <CardDescription>
              Status tiap kamar dan penyewa aktif / menunggu bayar.
            </CardDescription>
          </div>
          <ExportCsvButton
            filename={`okupansi-sinikos.csv`}
            headers={[
              "Properti",
              "Kamar",
              "Status kamar",
              "Harga",
              "Penyewa",
              "Status kontrak",
            ]}
            rows={occupancy.rows.map((r) => [
              r.propertyName,
              r.roomCode,
              statusLabel(r.status),
              r.price,
              r.tenantName,
              r.leaseStatus ? statusLabel(r.leaseStatus) : "",
            ])}
          />
        </CardHeader>
        <CardContent className="-mx-2 overflow-x-auto sm:mx-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Properti</TableHead>
                <TableHead>Kamar</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Harga</TableHead>
                <TableHead>Penyewa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {occupancy.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    Belum ada kamar.
                  </TableCell>
                </TableRow>
              ) : (
                occupancy.rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.propertyName}</TableCell>
                    <TableCell className="font-medium">{r.roomCode}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {statusLabel(r.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatRupiah(r.price)}</TableCell>
                    <TableCell>
                      {r.tenantName ?? (
                        <span className="text-muted-foreground">-</span>
                      )}
                      {r.leaseStatus === "PENDING" && (
                        <span className="ml-2 text-xs text-amber-800">
                          menunggu bayar
                        </span>
                      )}
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

function Stat({
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
        <CardTitle className="text-xl sm:text-2xl">{value}</CardTitle>
      </CardHeader>
      {hint && (
        <CardContent className="pt-0 text-xs text-muted-foreground">
          {hint}
        </CardContent>
      )}
    </Card>
  );
}
