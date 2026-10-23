"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  cancelPendingLeaseAction,
  checkOutAction,
} from "@/lib/actions/leases";
import { leaseStatusLabel } from "@/lib/labels";
import { matchesSearch, normalizeSearch } from "@/lib/list-filter";
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
import { ListSearch } from "@/components/list-search";

export type LeaseListItem = {
  id: string;
  monthlyRent: number;
  startDate: string;
  billingAnchorDay: number;
  status: string;
  tenantName: string;
  propertyName: string;
  roomCode: string;
};

function leaseStatusBadge(status: string) {
  if (status === "ACTIVE") return "success" as const;
  if (status === "PENDING") return "warning" as const;
  return "secondary" as const;
}

export function LeaseList({
  leases,
  isAnniversary,
}: {
  leases: LeaseListItem[];
  isAnniversary: boolean;
}) {
  const [query, setQuery] = useState("");
  const q = normalizeSearch(query);

  const filtered = useMemo(() => {
    if (!q) return leases;
    return leases.filter((lease) =>
      matchesSearch(
        [
          lease.tenantName,
          lease.propertyName,
          lease.roomCode,
          leaseStatusLabel(lease.status),
        ].join(" "),
        q,
      ),
    );
  }, [leases, q]);

  return (
    <Card className="xl:col-span-2">
      <CardHeader className="pb-3">
        {leases.length > 0 ? (
          <ListSearch
            value={query}
            onChange={setQuery}
            placeholder="Cari penyewa, kamar, status…"
          >
            <CardTitle>Daftar kontrak</CardTitle>
            <CardDescription>
              {q
                ? `${filtered.length} dari ${leases.length} kontrak`
                : `${leases.length} kontrak`}
            </CardDescription>
          </ListSearch>
        ) : (
          <div className="space-y-1.5">
            <CardTitle>Daftar kontrak</CardTitle>
            <CardDescription>0 kontrak</CardDescription>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3 p-3 pt-0 sm:p-6 sm:pt-0">
        {leases.length === 0 ? (
          <p className="px-1 py-6 text-sm text-muted-foreground">
            Belum ada kontrak. Gunakan form Check-in baru.
          </p>
        ) : filtered.length === 0 ? (
          <p className="px-1 py-6 text-sm text-muted-foreground">
            Tidak ada kontrak yang cocok dengan &quot;{query.trim()}&quot;.
          </p>
        ) : (
          <>
            <ul className="space-y-2 md:hidden">
              {filtered.map((lease) => (
                <li
                  key={lease.id}
                  className="rounded-lg border bg-card px-3 py-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium leading-tight">
                        {lease.tenantName}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {lease.roomCode} · {formatDate(lease.startDate)}
                        {isAnniversary
                          ? ` · tgl ${lease.billingAnchorDay}`
                          : ""}
                      </p>
                    </div>
                    <Badge
                      variant={leaseStatusBadge(lease.status)}
                      className="h-5 shrink-0 px-1.5 text-[10px] leading-none"
                    >
                      {leaseStatusLabel(lease.status)}
                    </Badge>
                  </div>

                  <div className="mt-2 flex items-baseline justify-between gap-2">
                    <p className="text-base font-semibold tabular-nums leading-none">
                      {formatRupiah(lease.monthlyRent)}
                      <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                        /bulan
                      </span>
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {lease.propertyName}
                    </p>
                  </div>

                  <div className="mt-2 flex flex-col gap-2">
                    {lease.status === "PENDING" && (
                      <>
                        <Button asChild size="sm" className="h-10 w-full">
                          <Link href="/invoices">Lunasin tagihan</Link>
                        </Button>
                        <form action={cancelPendingLeaseAction}>
                          <input
                            type="hidden"
                            name="leaseId"
                            value={lease.id}
                          />
                          <Button
                            type="submit"
                            size="sm"
                            variant="outline"
                            className="h-10 w-full"
                          >
                            Batalkan
                          </Button>
                        </form>
                      </>
                    )}
                    {lease.status === "ACTIVE" && (
                      <form action={checkOutAction}>
                        <input type="hidden" name="leaseId" value={lease.id} />
                        <Button
                          type="submit"
                          size="sm"
                          variant="outline"
                          className="h-10 w-full"
                        >
                          Check-out
                        </Button>
                      </form>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <div className="-mx-2 hidden overflow-x-auto md:mx-0 md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Penyewa</TableHead>
                    <TableHead>Kamar</TableHead>
                    <TableHead>Sewa</TableHead>
                    <TableHead>Mulai</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((lease) => (
                    <TableRow key={lease.id}>
                      <TableCell>{lease.tenantName}</TableCell>
                      <TableCell>
                        {lease.propertyName} · {lease.roomCode}
                      </TableCell>
                      <TableCell>{formatRupiah(lease.monthlyRent)}</TableCell>
                      <TableCell>
                        <div>{formatDate(lease.startDate)}</div>
                        {isAnniversary && (
                          <div className="text-xs text-muted-foreground">
                            Tiap tgl {lease.billingAnchorDay}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={leaseStatusBadge(lease.status)}>
                          {leaseStatusLabel(lease.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          {lease.status === "PENDING" && (
                            <>
                              <Button asChild size="sm" variant="default">
                                <Link href="/invoices">Lunasin tagihan</Link>
                              </Button>
                              <form action={cancelPendingLeaseAction}>
                                <input
                                  type="hidden"
                                  name="leaseId"
                                  value={lease.id}
                                />
                                <Button
                                  type="submit"
                                  size="sm"
                                  variant="outline"
                                >
                                  Batalkan
                                </Button>
                              </form>
                            </>
                          )}
                          {lease.status === "ACTIVE" && (
                            <form action={checkOutAction}>
                              <input
                                type="hidden"
                                name="leaseId"
                                value={lease.id}
                              />
                              <Button
                                type="submit"
                                size="sm"
                                variant="outline"
                              >
                                Check-out
                              </Button>
                            </form>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
