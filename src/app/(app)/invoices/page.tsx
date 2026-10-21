import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";
import {
  generateInvoicesNowAction,
  recordPaymentAction,
  resendWhatsAppAction,
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
import { isOrgMidtransConfigured } from "@/lib/payments/midtrans";

export default async function InvoicesPage() {
  const { organizationId, organization } = await requireOrg();
  const midtransReady = isOrgMidtransConfigured(organization);
  const invoices = await db.invoice.findMany({
    where: { organizationId },
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }, { createdAt: "desc" }],
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
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Tagihan
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Generate tagihan, bayar online (Midtrans), atau catat manual &amp;
            kirim WhatsApp.
            {!midtransReady && (
              <> Midtrans belum diatur — isi di Pengaturan.</>
            )}
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <GenerateInvoicesButton action={generateInvoicesNowAction} />
        </div>
      </div>

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
                          {inv.status !== "PAID" && midtransReady && (
                            <PayLinkButton
                              invoiceId={inv.id}
                              existingUrl={inv.paymentUrl}
                            />
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
                          <form action={resendWhatsAppAction}>
                            <input
                              type="hidden"
                              name="invoiceId"
                              value={inv.id}
                            />
                            <Button
                              type="submit"
                              size="sm"
                              variant="outline"
                              className="w-full sm:w-auto"
                            >
                              Kirim WA
                            </Button>
                          </form>
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
