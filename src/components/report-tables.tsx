"use client";

import { useMemo, useState } from "react";
import { matchesSearch, normalizeSearch } from "@/lib/list-filter";
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
import { ExportPdfButton } from "@/components/export-pdf-button";
import { ListSearch } from "@/components/list-search";

export type ArrearsRow = {
  id: string;
  tenantName: string;
  phone: string;
  propertyName: string;
  roomCode: string;
  period: string;
  amount: number;
  amountPaid: number;
  outstanding: number;
  dueDate: string;
  status: string;
  statusLabel: string;
};

export type OccupancyRow = {
  id: string;
  propertyName: string;
  roomCode: string;
  status: string;
  statusLabel: string;
  price: number;
  tenantName: string | null;
  leaseStatus: string | null;
  leaseStatusLabel: string;
};

export function ArrearsReportTable({
  rows,
  printedHint,
  totalOutstanding,
  count,
}: {
  rows: ArrearsRow[];
  printedHint: string;
  totalOutstanding: number;
  count: number;
}) {
  const [query, setQuery] = useState("");
  const q = normalizeSearch(query);
  const filtered = useMemo(() => {
    if (!q) return rows;
    return rows.filter((r) =>
      matchesSearch(
        [r.tenantName, r.phone, r.propertyName, r.roomCode, r.period, r.statusLabel].join(
          " ",
        ),
        q,
      ),
    );
  }, [rows, q]);

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <CardTitle>Tunggakan</CardTitle>
            <CardDescription>
              {q
                ? `${filtered.length} dari ${rows.length} tagihan`
                : "Tagihan belum lunas, sebagian, atau terlambat."}
            </CardDescription>
          </div>
          {rows.length > 0 && (
            <ListSearch
              value={query}
              onChange={setQuery}
              placeholder="Cari penyewa, kamar…"
              className="sm:max-w-xs"
            />
          )}
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:self-end">
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
            rows={rows.map((r) => [
              r.tenantName,
              r.phone,
              r.propertyName,
              r.roomCode,
              r.period,
              r.amount,
              r.amountPaid,
              r.outstanding,
              formatDate(r.dueDate),
              r.statusLabel,
            ])}
          />
          <ExportPdfButton
            filename={`tunggakan-sinikos.pdf`}
            title="Laporan Tunggakan"
            subtitle={printedHint}
            headers={[
              "Penyewa",
              "Properti",
              "Kamar",
              "Periode",
              "Sisa",
              "Jatuh tempo",
              "Status",
            ]}
            rows={rows.map((r) => [
              r.tenantName,
              r.propertyName,
              r.roomCode,
              r.period,
              formatRupiah(r.outstanding),
              formatDate(r.dueDate),
              r.statusLabel,
            ])}
            footNote={`Total tunggakan: ${formatRupiah(totalOutstanding)} (${count} tagihan)`}
          />
        </div>
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
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  Tidak ada tunggakan.
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  Tidak ada hasil untuk &quot;{query.trim()}&quot;.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
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
                      {r.statusLabel}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function OccupancyReportTable({
  rows,
  printedHint,
  occupancyRate,
  summary,
}: {
  rows: OccupancyRow[];
  printedHint: string;
  occupancyRate: number;
  summary: {
    occupied: number;
    total: number;
    available: number;
    pendingCheckIn: number;
  };
}) {
  const [query, setQuery] = useState("");
  const q = normalizeSearch(query);
  const filtered = useMemo(() => {
    if (!q) return rows;
    return rows.filter((r) =>
      matchesSearch(
        [
          r.propertyName,
          r.roomCode,
          r.statusLabel,
          r.tenantName ?? "",
          r.leaseStatusLabel,
        ].join(" "),
        q,
      ),
    );
  }, [rows, q]);

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <CardTitle>Okupansi kamar</CardTitle>
            <CardDescription>
              {q
                ? `${filtered.length} dari ${rows.length} kamar`
                : "Status tiap kamar dan penyewa aktif / menunggu bayar."}
            </CardDescription>
          </div>
          {rows.length > 0 && (
            <ListSearch
              value={query}
              onChange={setQuery}
              placeholder="Cari properti, kamar, penyewa…"
              className="sm:max-w-xs"
            />
          )}
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:self-end">
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
            rows={rows.map((r) => [
              r.propertyName,
              r.roomCode,
              r.statusLabel,
              r.price,
              r.tenantName,
              r.leaseStatus ? r.leaseStatusLabel : "",
            ])}
          />
          <ExportPdfButton
            filename={`okupansi-sinikos.pdf`}
            title="Laporan Okupansi Kamar"
            subtitle={printedHint}
            headers={[
              "Properti",
              "Kamar",
              "Status",
              "Harga",
              "Penyewa",
              "Kontrak",
            ]}
            rows={rows.map((r) => [
              r.propertyName,
              r.roomCode,
              r.statusLabel,
              formatRupiah(r.price),
              r.tenantName ?? "-",
              r.leaseStatus ? r.leaseStatusLabel : "-",
            ])}
            footNote={`Okupansi ${occupancyRate}% · ${summary.occupied}/${summary.total} kamar terisi · ${summary.available} kosong · ${summary.pendingCheckIn} menunggu bayar`}
          />
        </div>
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
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  Belum ada kamar.
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  Tidak ada hasil untuk &quot;{query.trim()}&quot;.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.propertyName}</TableCell>
                  <TableCell className="font-medium">{r.roomCode}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{r.statusLabel}</Badge>
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
  );
}
