"use client";

import { updateRoomStatusAction } from "@/lib/actions/properties";
import { useServerAction } from "@/hooks/use-server-action";
import {
  roomOccupancyBadgeVariant,
  roomOccupancyLabel,
} from "@/lib/labels";
import { formatRupiah } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PendingSubmitButton } from "@/components/pending-submit-button";
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

export type RoomListItem = {
  id: string;
  code: string;
  price: number;
  status: string;
  leaseStatus: string | null;
};

function RoomStatusForm({
  roomId,
  status,
  fullWidth,
}: {
  roomId: string;
  status: string;
  fullWidth?: boolean;
}) {
  const current = status === "MAINTENANCE" ? "MAINTENANCE" : "AVAILABLE";
  const { pending, onSubmit } = useServerAction(updateRoomStatusAction, {
    success: "Status kamar disimpan",
    error: "Gagal mengubah status kamar",
  });

  return (
    <form
      onSubmit={onSubmit}
      className={
        fullWidth
          ? "flex flex-row gap-2"
          : "flex flex-row flex-wrap items-center justify-end gap-2"
      }
    >
      <input type="hidden" name="roomId" value={roomId} />
      <select
        name="status"
        defaultValue={current}
        aria-label="Status kamar"
        disabled={pending}
        className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-50"
      >
        <option value="AVAILABLE">Kosong</option>
        <option value="MAINTENANCE">Perawatan</option>
      </select>
      <PendingSubmitButton
        pending={pending}
        pendingLabel="…"
        size="sm"
        variant="outline"
        className="h-10 shrink-0 px-3"
      >
        Simpan
      </PendingSubmitButton>
    </form>
  );
}

function RoomActions({
  room,
  fullWidth,
}: {
  room: RoomListItem;
  fullWidth?: boolean;
}) {
  if (room.leaseStatus === "ACTIVE" || room.leaseStatus === "PENDING") {
    return (
      <p
        className={
          fullWidth
            ? "text-xs text-muted-foreground"
            : "text-right text-xs text-muted-foreground"
        }
      >
        {room.leaseStatus === "PENDING"
          ? "Dikunci kontrak menunggu bayar — ubah di Kontrak."
          : "Dikunci kontrak aktif — ubah lewat check-out."}
      </p>
    );
  }

  return (
    <RoomStatusForm
      roomId={room.id}
      status={room.status}
      fullWidth={fullWidth}
    />
  );
}

export function RoomList({ rooms }: { rooms: RoomListItem[] }) {
  return (
    <Card className="xl:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle>Kamar</CardTitle>
        <CardDescription>
          {rooms.length} kamar · Terisi/menunggu bayar mengikuti kontrak
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-3 pt-0 sm:p-6 sm:pt-0">
        {rooms.length === 0 ? (
          <p className="px-1 py-6 text-sm text-muted-foreground">
            Belum ada kamar. Isi form &quot;Tambah kamar&quot; — contoh kode: A1,
            harga sewa bulanan.
          </p>
        ) : (
          <>
            <ul className="space-y-2 md:hidden">
              {rooms.map((room) => (
                <li
                  key={room.id}
                  className="rounded-lg border bg-card px-3 py-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium leading-tight">
                        {room.code}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatRupiah(room.price)} /bulan
                      </p>
                    </div>
                    <Badge
                      variant={roomOccupancyBadgeVariant({
                        roomStatus: room.status,
                        leaseStatus: room.leaseStatus,
                      })}
                      className="h-5 shrink-0 px-1.5 text-[10px] leading-none"
                    >
                      {roomOccupancyLabel({
                        roomStatus: room.status,
                        leaseStatus: room.leaseStatus,
                      })}
                    </Badge>
                  </div>
                  <div className="mt-2">
                    <RoomActions room={room} fullWidth />
                  </div>
                </li>
              ))}
            </ul>

            <div className="-mx-2 hidden overflow-x-auto md:mx-0 md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Harga</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rooms.map((room) => (
                    <TableRow key={room.id}>
                      <TableCell className="font-medium">{room.code}</TableCell>
                      <TableCell>{formatRupiah(room.price)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={roomOccupancyBadgeVariant({
                            roomStatus: room.status,
                            leaseStatus: room.leaseStatus,
                          })}
                        >
                          {roomOccupancyLabel({
                            roomStatus: room.status,
                            leaseStatus: room.leaseStatus,
                          })}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <RoomActions room={room} />
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
