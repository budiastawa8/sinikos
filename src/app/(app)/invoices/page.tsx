import Link from "next/link";
import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";
import { isProActive } from "@/lib/billing/plans";
import { getWhatsAppQuotaUsage } from "@/lib/billing/whatsapp-quota";
import { generateInvoicesNowAction } from "@/lib/actions/invoices";
import {
  invoiceStatusBadgeVariant,
  invoiceStatusLabel,
  whatsappStatusBadgeVariant,
  whatsappStatusLabel,
} from "@/lib/labels";
import { formatRupiah, formatDate, MONTHS_ID } from "@/lib/utils";
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
import { GenerateInvoicesButton } from "@/components/generate-invoices-button";
import { InvoiceRowActions } from "@/components/invoice-row-actions";
import { isOrgMidtransConfigured } from "@/lib/payments/midtrans";

export default async function InvoicesPage() {
  const { organizationId, organization } = await requireOrg();
  const pro = isProActive(organization);
  const midtransReady = isOrgMidtransConfigured(organization);
  const [invoices, waQuota] = await Promise.all([
    db.invoice.findMany({
      where: { organizationId },
      orderBy: [
        { periodYear: "desc" },
        { periodMonth: "desc" },
        { createdAt: "desc" },
      ],
      take: 60,
      select: {
        id: true,
        periodYear: true,
        periodMonth: true,
        amount: true,
        amountPaid: true,
        dueDate: true,
        status: true,
        paymentUrl: true,
        midtransOrderId: true,
        lease: {
          select: {
            tenant: { select: { name: true } },
            room: {
              select: {
                code: true,
                property: { select: { name: true } },
              },
            },
          },
        },
        whatsappLogs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { status: true },
        },
      },
    }),
    pro ? getWhatsAppQuotaUsage(organizationId) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Tagihan
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Melunasi tagihan check-in pertama akan mengaktifkan kontrak dan
            menandai kamar terisi.{" "}
            {pro
              ? "Generate tagihan, lalu pakai tombol Aksi untuk catat bayar, WhatsApp, atau link Midtrans."
              : "Generate tagihan atau catat bayar lewat tombol Aksi. Link bayar dan WhatsApp ada di paket Pro."}{" "}
            {!pro && (
              <Link href="/billing" className="font-medium text-primary underline">
                Lihat langganan.
              </Link>
            )}
            {pro && !midtransReady && (
              <>
                {" "}
                Midtrans belum diaktifkan — tidak wajib; isi di Pengaturan atau{" "}
                <Link
                  href="/panduan#midtrans"
                  className="font-medium text-primary underline"
                >
                  baca panduan
                </Link>
                .
              </>
            )}
            {pro && midtransReady && organization.midtransIsProduction && (
              <>
                {" "}
                Mode Midtrans:{" "}
                <span className="font-medium text-amber-800">Production</span>{" "}
                (uang sungguhan).{" "}
                <Link
                  href="/panduan#production"
                  className="font-medium text-primary underline"
                >
                  Panduan Production
                </Link>
                .
              </>
            )}
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <GenerateInvoicesButton action={generateInvoicesNowAction} />
        </div>
      </div>

      {waQuota?.exhausted && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Kuota WhatsApp {waQuota.periodLabel} habis ({waQuota.used}/
          {waQuota.limit}). Tombol Kirim WA dan pengiriman otomatis ditahan;
          catat bayar manual tetap bisa.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Semua tagihan</CardTitle>
          <CardDescription>
            {invoices.length}
            {invoices.length >= 60 ? "+" : ""} tagihan terbaru
            {invoices.length >= 60 ? " (maks. 60 ditampilkan)" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="-mx-2 overflow-x-auto sm:mx-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Periode</TableHead>
                <TableHead>Penyewa</TableHead>
                <TableHead>Kamar</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead>Terbayar</TableHead>
                <TableHead>Jatuh tempo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>WA</TableHead>
                <TableHead className="w-[6.5rem]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-muted-foreground">
                    Belum ada tagihan. Klik &quot;Generate tagihan bulan ini&quot;.
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => {
                  const lastWa = inv.whatsappLogs[0];
                  const periodLabel = `${MONTHS_ID[inv.periodMonth - 1]} ${inv.periodYear}`;
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="whitespace-nowrap">
                        {periodLabel}
                      </TableCell>
                      <TableCell>{inv.lease.tenant.name}</TableCell>
                      <TableCell>
                        {inv.lease.room.property.name} · {inv.lease.room.code}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatRupiah(inv.amount)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatRupiah(inv.amountPaid)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(inv.dueDate)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={invoiceStatusBadgeVariant(inv.status)}>
                          {invoiceStatusLabel(inv.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {lastWa ? (
                          <Badge
                            variant={whatsappStatusBadgeVariant(lastWa.status)}
                          >
                            {whatsappStatusLabel(lastWa.status)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <InvoiceRowActions
                          invoiceId={inv.id}
                          tenantName={inv.lease.tenant.name}
                          periodLabel={periodLabel}
                          amount={inv.amount}
                          amountPaid={inv.amountPaid}
                          status={inv.status}
                          paymentUrl={inv.paymentUrl}
                          midtransOrderId={inv.midtransOrderId}
                          pro={pro}
                          midtransReady={midtransReady}
                          waDisabled={Boolean(waQuota?.exhausted)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
