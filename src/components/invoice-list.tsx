"use client";

import { useMemo, useState } from "react";
import {
  invoiceStatusBadgeVariant,
  invoiceStatusLabel,
  whatsappStatusBadgeVariant,
  whatsappStatusLabel,
} from "@/lib/labels";
import { matchesSearch, normalizeSearch } from "@/lib/list-filter";
import { formatDate, formatRupiah, MONTHS_ID } from "@/lib/utils";
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
import { InvoiceRowActions } from "@/components/invoice-row-actions";
import { ListSearch } from "@/components/list-search";

export type InvoiceListItem = {
  id: string;
  periodYear: number;
  periodMonth: number;
  amount: number;
  amountPaid: number;
  dueDate: string;
  status: string;
  paymentUrl: string | null;
  midtransOrderId: string | null;
  tenantName: string;
  propertyName: string;
  roomCode: string;
  waStatus: string | null;
};

export function InvoiceList({
  invoices,
  emptyHint,
  pro,
  midtransReady,
  waDisabled,
}: {
  invoices: InvoiceListItem[];
  emptyHint: string;
  pro: boolean;
  midtransReady: boolean;
  waDisabled: boolean;
}) {
  const [query, setQuery] = useState("");
  const q = normalizeSearch(query);

  const filtered = useMemo(() => {
    if (!q) return invoices;
    return invoices.filter((inv) => {
      const periodLabel = `${MONTHS_ID[inv.periodMonth - 1]} ${inv.periodYear}`;
      const haystack = [
        inv.tenantName,
        inv.propertyName,
        inv.roomCode,
        periodLabel,
        invoiceStatusLabel(inv.status),
      ].join(" ");
      return matchesSearch(haystack, q);
    });
  }, [invoices, q]);

  return (
    <Card id="daftar-tagihan">
      <CardHeader className="gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <CardTitle>Semua tagihan</CardTitle>
          <CardDescription>
            {q
              ? `${filtered.length} dari ${invoices.length} tagihan`
              : `${invoices.length}${invoices.length >= 60 ? "+" : ""} tagihan terbaru${invoices.length >= 60 ? " (maks. 60 ditampilkan)" : ""}`}
          </CardDescription>
        </div>
        {invoices.length > 0 && (
          <ListSearch
            value={query}
            onChange={setQuery}
            placeholder="Cari nama, kamar, periode…"
            className="sm:max-w-xs"
          />
        )}
      </CardHeader>
      <CardContent className="space-y-3 p-3 pt-0 sm:p-6 sm:pt-0">
        {invoices.length === 0 ? (
          <p className="px-1 py-6 text-sm text-muted-foreground">{emptyHint}</p>
        ) : filtered.length === 0 ? (
          <p className="px-1 py-6 text-sm text-muted-foreground">
            Tidak ada tagihan yang cocok dengan &quot;{query.trim()}&quot;.
          </p>
        ) : (
          <>
            <ul className="space-y-3 md:hidden">
              {filtered.map((inv) => {
                const periodLabel = `${MONTHS_ID[inv.periodMonth - 1]} ${inv.periodYear}`;
                const outstanding = Math.max(0, inv.amount - inv.amountPaid);
                const unpaid = inv.status !== "PAID";

                return (
                  <li
                    key={inv.id}
                    className="rounded-xl border bg-card px-3 py-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium leading-tight">
                          {inv.tenantName}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {inv.propertyName} · {inv.roomCode} · {periodLabel}
                        </p>
                      </div>
                      <Badge
                        variant={invoiceStatusBadgeVariant(inv.status)}
                        className="shrink-0"
                      >
                        {invoiceStatusLabel(inv.status)}
                      </Badge>
                    </div>

                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground">
                        {unpaid ? "Sisa bayar" : "Lunas"}
                      </p>
                      <p className="text-lg font-semibold tabular-nums leading-tight">
                        {formatRupiah(unpaid ? outstanding : inv.amount)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Jatuh tempo {formatDate(inv.dueDate)}
                        {inv.waStatus
                          ? ` · WA ${whatsappStatusLabel(inv.waStatus)}`
                          : ""}
                      </p>
                    </div>

                    <div className="mt-3">
                      <InvoiceRowActions
                        invoiceId={inv.id}
                        tenantName={inv.tenantName}
                        periodLabel={periodLabel}
                        amount={inv.amount}
                        amountPaid={inv.amountPaid}
                        status={inv.status}
                        paymentUrl={inv.paymentUrl}
                        midtransOrderId={inv.midtransOrderId}
                        pro={pro}
                        canWhatsApp
                        midtransReady={midtransReady}
                        waDisabled={waDisabled}
                        fullWidth
                      />
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="-mx-2 hidden overflow-x-auto md:mx-0 md:block">
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
                  {filtered.map((inv) => {
                    const periodLabel = `${MONTHS_ID[inv.periodMonth - 1]} ${inv.periodYear}`;
                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="whitespace-nowrap">
                          {periodLabel}
                        </TableCell>
                        <TableCell>{inv.tenantName}</TableCell>
                        <TableCell>
                          {inv.propertyName} · {inv.roomCode}
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
                          {inv.waStatus ? (
                            <Badge
                              variant={whatsappStatusBadgeVariant(inv.waStatus)}
                            >
                              {whatsappStatusLabel(inv.waStatus)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <InvoiceRowActions
                            invoiceId={inv.id}
                            tenantName={inv.tenantName}
                            periodLabel={periodLabel}
                            amount={inv.amount}
                            amountPaid={inv.amountPaid}
                            status={inv.status}
                            paymentUrl={inv.paymentUrl}
                            midtransOrderId={inv.midtransOrderId}
                            pro={pro}
                            canWhatsApp
                            midtransReady={midtransReady}
                            waDisabled={waDisabled}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
