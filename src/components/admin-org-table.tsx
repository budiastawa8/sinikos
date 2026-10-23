"use client";

import { useMemo, useState } from "react";
import { matchesSearch, normalizeSearch } from "@/lib/list-filter";
import { formatDate } from "@/lib/utils";
import type { PlatformOrgRow } from "@/lib/platform-metrics";
import { Badge } from "@/components/ui/badge";
import { ListSearch } from "@/components/list-search";
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

function planBadge(plan: string) {
  if (plan === "PRO_PLUS") return "success" as const;
  if (plan === "PRO") return "warning" as const;
  return "secondary" as const;
}

export function AdminOrgTable({ organizations }: { organizations: PlatformOrgRow[] }) {
  const [query, setQuery] = useState("");
  const q = normalizeSearch(query);

  const filtered = useMemo(() => {
    if (!q) return organizations;
    return organizations.filter((o) =>
      matchesSearch(
        [o.name, o.ownerName ?? "", o.ownerEmail ?? "", o.planLabel].join(" "),
        q,
      ),
    );
  }, [organizations, q]);

  return (
    <Card>
      <CardHeader className="pb-3">
        {organizations.length > 0 ? (
          <ListSearch
            value={query}
            onChange={setQuery}
            placeholder="Cari bisnis, pemilik, email…"
          >
            <CardTitle>Organisasi</CardTitle>
            <CardDescription>
              {q
                ? `${filtered.length} dari ${organizations.length} (maks. 300 terbaru)`
                : `${organizations.length} terbaru (maks. 300)`}
            </CardDescription>
          </ListSearch>
        ) : (
          <div className="space-y-1.5">
            <CardTitle>Organisasi</CardTitle>
            <CardDescription>Belum ada organisasi</CardDescription>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3 p-3 pt-0 sm:p-6 sm:pt-0">
        {filtered.length === 0 ? (
          <p className="px-1 py-6 text-sm text-muted-foreground">
            {organizations.length === 0
              ? "Belum ada bisnis terdaftar."
              : `Tidak ada yang cocok dengan "${query.trim()}".`}
          </p>
        ) : (
          <>
            <ul className="space-y-2 md:hidden">
              {filtered.map((o) => (
                <li
                  key={o.id}
                  className="rounded-lg border bg-card px-3 py-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{o.name}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {o.ownerName ?? "—"} · {o.ownerEmail ?? "—"}
                      </p>
                    </div>
                    <Badge
                      variant={planBadge(o.planActive)}
                      className="h-5 shrink-0 px-1.5 text-[10px]"
                    >
                      {o.planLabel}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {o.propertyCount} kos · {o.roomCount} kamar · daftar{" "}
                    {formatDate(o.createdAt)}
                    {o.planExpiresAt
                      ? ` · aktif s/d ${formatDate(o.planExpiresAt)}`
                      : ""}
                  </p>
                </li>
              ))}
            </ul>

            <div className="-mx-2 hidden overflow-x-auto md:mx-0 md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bisnis</TableHead>
                    <TableHead>Pemilik</TableHead>
                    <TableHead>Paket</TableHead>
                    <TableHead className="text-right">Kos</TableHead>
                    <TableHead className="text-right">Kamar</TableHead>
                    <TableHead>Daftar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">{o.name}</TableCell>
                      <TableCell>
                        <div className="text-sm">{o.ownerName ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">
                          {o.ownerEmail ?? "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={planBadge(o.planActive)}>
                          {o.planLabel}
                        </Badge>
                        {o.planExpiresAt && (
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            s/d {formatDate(o.planExpiresAt)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {o.propertyCount}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {o.roomCount}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(o.createdAt)}
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
