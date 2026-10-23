"use client";

import { useMemo, useState } from "react";
import { deleteTenantAction } from "@/lib/actions/properties";
import { matchesSearch, normalizeSearch } from "@/lib/list-filter";
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
import { TenantEditButton } from "@/components/tenant-edit-button";

export type TenantListItem = {
  id: string;
  name: string;
  phone: string;
  roomCode: string | null;
};

export function TenantList({ tenants }: { tenants: TenantListItem[] }) {
  const [query, setQuery] = useState("");
  const q = normalizeSearch(query);

  const filtered = useMemo(() => {
    if (!q) return tenants;
    return tenants.filter((t) =>
      matchesSearch([t.name, t.phone, t.roomCode ?? ""].join(" "), q),
    );
  }, [tenants, q]);

  return (
    <Card className="xl:col-span-2">
      <CardHeader className="pb-3">
        {tenants.length > 0 ? (
          <ListSearch
            value={query}
            onChange={setQuery}
            placeholder="Cari nama, WhatsApp, kamar…"
          >
            <CardTitle>Daftar penyewa</CardTitle>
            <CardDescription>
              {q
                ? `${filtered.length} dari ${tenants.length} penyewa`
                : `${tenants.length} penyewa`}
            </CardDescription>
          </ListSearch>
        ) : (
          <div className="space-y-1.5">
            <CardTitle>Daftar penyewa</CardTitle>
            <CardDescription>0 penyewa</CardDescription>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3 p-3 pt-0 sm:p-6 sm:pt-0">
        {tenants.length === 0 ? (
          <p className="px-1 py-6 text-sm text-muted-foreground">
            Belum ada penyewa. Pakai form &quot;Tambah penyewa&quot;.
          </p>
        ) : filtered.length === 0 ? (
          <p className="px-1 py-6 text-sm text-muted-foreground">
            Tidak ada penyewa yang cocok dengan &quot;{query.trim()}&quot;.
          </p>
        ) : (
          <>
            <ul className="space-y-2 md:hidden">
              {filtered.map((t) => (
                <li
                  key={t.id}
                  className="rounded-lg border bg-card px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium leading-tight">
                      {t.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {t.phone}
                      {t.roomCode ? ` · Kamar ${t.roomCode}` : " · Belum check-in"}
                    </p>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <TenantEditButton
                      id={t.id}
                      name={t.name}
                      phone={t.phone}
                      fullWidth
                    />
                    <form action={deleteTenantAction}>
                      <input type="hidden" name="id" value={t.id} />
                      <Button
                        type="submit"
                        variant="outline"
                        size="sm"
                        className="h-10 w-full"
                      >
                        Hapus
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>

            <div className="-mx-2 hidden overflow-x-auto md:mx-0 md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Kamar aktif</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>{t.phone}</TableCell>
                      <TableCell>{t.roomCode ?? "-"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap justify-end gap-2">
                          <TenantEditButton
                            id={t.id}
                            name={t.name}
                            phone={t.phone}
                          />
                          <form action={deleteTenantAction}>
                            <input type="hidden" name="id" value={t.id} />
                            <Button type="submit" size="sm" variant="ghost">
                              Hapus
                            </Button>
                          </form>
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
