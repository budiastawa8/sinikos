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
import { formatRupiah } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrearsReportTable,
  OccupancyReportTable,
} from "@/components/report-tables";

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

  const printedHint = `Organisasi: ${organization.name}`;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Laporan
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Tunggakan sewa dan okupansi kamar. Fitur paket Pro+.{" "}
          <Link
            href="/panduan#langganan"
            className="font-medium text-primary underline"
          >
            Tentang paket
          </Link>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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

      <ArrearsReportTable
        printedHint={printedHint}
        totalOutstanding={arrears.totalOutstanding}
        count={arrears.count}
        rows={arrears.rows.map((r) => ({
          id: r.id,
          tenantName: r.tenantName,
          phone: r.phone,
          propertyName: r.propertyName,
          roomCode: r.roomCode,
          period: r.period,
          amount: r.amount,
          amountPaid: r.amountPaid,
          outstanding: r.outstanding,
          dueDate: r.dueDate.toISOString(),
          status: r.status,
          statusLabel: statusLabel(r.status),
        }))}
      />

      <OccupancyReportTable
        printedHint={printedHint}
        occupancyRate={occupancy.occupancyRate}
        summary={occupancy.summary}
        rows={occupancy.rows.map((r) => ({
          id: r.id,
          propertyName: r.propertyName,
          roomCode: r.roomCode,
          status: r.status,
          statusLabel: statusLabel(r.status),
          price: r.price,
          tenantName: r.tenantName,
          leaseStatus: r.leaseStatus,
          leaseStatusLabel: r.leaseStatus ? statusLabel(r.leaseStatus) : "",
        }))}
      />
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
      <CardHeader className="space-y-1 p-3 sm:p-6 sm:pb-2">
        <CardDescription className="text-xs sm:text-sm">{title}</CardDescription>
        <CardTitle className="text-base leading-tight break-words sm:text-2xl">
          {value}
        </CardTitle>
      </CardHeader>
      {hint && (
        <CardContent className="px-3 pb-3 pt-0 text-xs text-muted-foreground sm:px-6 sm:pb-6">
          {hint}
        </CardContent>
      )}
    </Card>
  );
}
