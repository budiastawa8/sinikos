import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";
import { loadEntitlements } from "@/lib/billing/entitlements";
import { canAdd } from "@/lib/billing/plans";
import {
  createRoomAction,
  updateRoomStatusAction,
} from "@/lib/actions/properties";
import {
  roomStatusBadgeVariant,
  roomStatusLabel,
} from "@/lib/labels";
import { formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlanLimitNotice } from "@/components/plan-limit-notice";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { organizationId, organization } = await requireOrg();
  const entitlements = await loadEntitlements(organization);
  const atRoomLimit = !canAdd(
    entitlements.usage.rooms,
    entitlements.limits.maxRooms,
  );
  const property = await db.property.findFirst({
    where: { id, organizationId },
    include: { rooms: { orderBy: { code: "asc" } } },
  });
  if (!property) notFound();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {property.name}
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          {property.address || "Tanpa alamat"}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Kamar</CardTitle>
            <CardDescription>{property.rooms.length} kamar</CardDescription>
          </CardHeader>
          <CardContent className="-mx-2 overflow-x-auto sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Harga</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {property.rooms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      Belum ada kamar. Isi form &quot;Tambah kamar&quot; di
                      sebelah — contoh kode: A1, harga sewa bulanan.
                    </TableCell>
                  </TableRow>
                ) : (
                  property.rooms.map((room) => (
                    <TableRow key={room.id}>
                      <TableCell className="font-medium">{room.code}</TableCell>
                      <TableCell>{formatRupiah(room.price)}</TableCell>
                      <TableCell>
                        <Badge variant={roomStatusBadgeVariant(room.status)}>
                          {roomStatusLabel(room.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <form
                          action={updateRoomStatusAction}
                          className="flex flex-col gap-2 sm:flex-row"
                        >
                          <input type="hidden" name="roomId" value={room.id} />
                          <select
                            name="status"
                            defaultValue={room.status}
                            className="h-10 min-w-0 flex-1 rounded-md border px-2 text-sm sm:h-9"
                          >
                            <option value="AVAILABLE">Kosong</option>
                            <option value="OCCUPIED">Terisi</option>
                            <option value="MAINTENANCE">Perawatan</option>
                          </select>
                          <Button
                            type="submit"
                            size="sm"
                            variant="outline"
                            className="h-10 sm:h-9"
                          >
                            Simpan
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

        <Card>
          <CardHeader>
            <CardTitle>Tambah kamar</CardTitle>
            {!entitlements.active && entitlements.limits.maxRooms != null && (
              <CardDescription>
                Paket Gratis: {entitlements.usage.rooms} dari{" "}
                {entitlements.limits.maxRooms} kamar di seluruh bisnis
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {atRoomLimit ? (
              <PlanLimitNotice>
                Batas kamar paket Gratis sudah tercapai. Kamar yang sudah ada
                tetap bisa diubah statusnya.
              </PlanLimitNotice>
            ) : (
              <form action={createRoomAction} className="space-y-4">
                <input type="hidden" name="propertyId" value={property.id} />
                <div className="space-y-2">
                  <Label htmlFor="code">Kode kamar</Label>
                  <Input id="code" name="code" required placeholder="A01" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Harga sewa / bulan</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    required
                    min={1}
                    placeholder="1500000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Catatan</Label>
                  <Input id="notes" name="notes" />
                </div>
                <Button type="submit" className="h-11 w-full">
                  Simpan kamar
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
