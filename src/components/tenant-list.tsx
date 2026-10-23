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
      <CardHeader>
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
      <CardContent className="-mx-2 overflow-x-auto sm:mx-0">
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
            {tenants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  Belum ada penyewa. Pakai form &quot;Tambah penyewa&quot;.
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  Tidak ada penyewa yang cocok dengan &quot;{query.trim()}&quot;.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>{t.phone}</TableCell>
                  <TableCell>{t.roomCode ?? "-"}</TableCell>
                  <TableCell>
                    <form action={deleteTenantAction}>
                      <input type="hidden" name="id" value={t.id} />
                      <Button type="submit" size="sm" variant="ghost">
                        Hapus
                      </Button>
                    </form>
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
