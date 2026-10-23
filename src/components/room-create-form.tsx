"use client";

import { createRoomAction } from "@/lib/actions/properties";
import { useServerAction } from "@/hooks/use-server-action";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingSubmitButton } from "@/components/pending-submit-button";

export function RoomCreateForm({ propertyId }: { propertyId: string }) {
  const { pending, onSubmit } = useServerAction(createRoomAction, {
    success: "Kamar disimpan",
    error: "Gagal menyimpan kamar",
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="propertyId" value={propertyId} />
      <div className="space-y-2">
        <Label htmlFor="code">Kode kamar</Label>
        <Input
          id="code"
          name="code"
          required
          placeholder="A01"
          disabled={pending}
        />
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
          disabled={pending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Catatan</Label>
        <Input id="notes" name="notes" disabled={pending} />
      </div>
      <PendingSubmitButton pending={pending} className="h-11 w-full">
        Simpan kamar
      </PendingSubmitButton>
    </form>
  );
}
