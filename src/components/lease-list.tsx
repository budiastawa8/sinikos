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
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <CardTitle>Daftar kontrak</CardTitle>
          <CardDescription>
            {q
              ? `${filtered.length} dari ${leases.length} kontrak`
              : `${leases.length} kontrak`}
          </CardDescription>
        </div>
        {leases.length > 0 && (
          <ListSearch
            value={query}
            onChange={setQuery}
            placeholder="Cari penyewa, kamar, status…"
            className="sm:max-w-xs"
          />
        )}
      </CardHeader>
      <CardContent className="-mx-2 overflow-x-auto sm:mx-0">
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
            {leases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  Belum ada kontrak. Gunakan form Check-in baru.
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  Tidak ada kontrak yang cocok dengan &quot;{query.trim()}&quot;.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((lease) => (
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
                            <Button type="submit" size="sm" variant="outline">
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
                          <Button type="submit" size="sm" variant="outline">
                            Check-out
                          </Button>
                        </form>
                      )}
                    </div>
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
