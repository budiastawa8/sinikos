import Link from "next/link";
import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";
import { isProActive } from "@/lib/billing/plans";
import { getWhatsAppQuotaUsage } from "@/lib/billing/whatsapp-quota";
import {
  generateInvoicesNowAction,
  recordPaymentAction,
} from "@/lib/actions/invoices";
import { formatRupiah, formatDate, MONTHS_ID } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { PayLinkButton } from "@/components/pay-link-button";
import { SyncMidtransButton } from "@/components/sync-midtrans-button";
import { SendWhatsAppButton } from "@/components/send-whatsapp-button";
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
      include: {
        lease: {
          include: {
            tenant: true,
            room: { include: { property: true } },
          },
        },
        whatsappLogs: {
          orderBy: { createdAt: "desc" },
          take: 1,
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
            {pro
              ? "Generate tagihan, catat bayar manual, kirim WhatsApp, atau (opsional) buat link Midtrans."
              : "Generate tagihan atau catat bayar manual. Link bayar dan WhatsApp ada di paket Pro."}{" "}
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
          <CardDescription>{invoices.length} tagihan</CardDescription>
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
                <TableHead>Aksi</TableHead>
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
                  return (
                    <TableRow key={inv.id}>
                      <TableCell>
                        {MONTHS_ID[inv.periodMonth - 1]} {inv.periodYear}
                      </TableCell>
                      <TableCell>{inv.lease.tenant.name}</TableCell>
                      <TableCell>
                        {inv.lease.room.property.name} · {inv.lease.room.code}
                      </TableCell>
                      <TableCell>{formatRupiah(inv.amount)}</TableCell>
                      <TableCell>{formatRupiah(inv.amountPaid)}</TableCell>
                      <TableCell>{formatDate(inv.dueDate)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            inv.status === "PAID"
                              ? "success"
                              : inv.status === "OVERDUE"
                                ? "destructive"
                                : "warning"
                          }
                        >
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {lastWa ? (
                          <Badge
                            variant={
                              lastWa.status === "SENT" ? "success" : "destructive"
                            }
                          >
                            {lastWa.status}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex min-w-[12rem] flex-col gap-2">
                          {inv.status !== "PAID" && pro && midtransReady && (
                            <PayLinkButton
                              invoiceId={inv.id}
                              existingUrl={inv.paymentUrl}
                            />
                          )}
                          {inv.status !== "PAID" &&
                            midtransReady &&
                            inv.midtransOrderId && (
                              <SyncMidtransButton invoiceId={inv.id} />
                            )}
                          {inv.status !== "PAID" && (
                            <form
                              action={recordPaymentAction}
                              className="flex flex-wrap gap-2"
                            >
                              <input
                                type="hidden"
                                name="invoiceId"
                                value={inv.id}
                              />
                              <Input
                                name="amount"
                                type="number"
                                min={1}
                                placeholder="Nominal"
                                className="h-8 w-28"
                                required
                              />
                              <input
                                type="hidden"
                                name="method"
                                value="TRANSFER"
                              />
                              <Button type="submit" size="sm">
                                Catat bayar
                              </Button>
                            </form>
                          )}
                          {pro && (
                            <SendWhatsAppButton
                              invoiceId={inv.id}
                              disabled={Boolean(waQuota?.exhausted)}
                            />
                          )}
                        </div>
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
