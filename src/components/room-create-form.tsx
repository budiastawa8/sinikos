"use client";

import { createRoomAction } from "@/lib/actions/properties";
import { useServerAction } from "@/hooks/use-server-action";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingSubmitButton } from "@/components/pending-submit-button";

export function RoomCreateForm({
  propertyId,
  idPrefix = "room",
  onSuccess,
}: {
  propertyId: string;
  idPrefix?: string;
  onSuccess?: () => void;
}) {
  const { pending, run } = useServerAction(createRoomAction, {
    success: "Kamar disimpan",
    error: "Gagal menyimpan kamar",
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(new FormData(e.currentTarget), onSuccess);
      }}
    >
      <input type="hidden" name="propertyId" value={propertyId} />
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-code`}>Kode kamar</Label>
        <Input
          id={`${idPrefix}-code`}
          name="code"
          required
          placeholder="A01"
          disabled={pending}
          className="h-11"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-price`}>Harga sewa / bulan</Label>
        <Input
          id={`${idPrefix}-price`}
          name="price"
          type="number"
          required
          min={1}
          placeholder="1500000"
          disabled={pending}
          className="h-11"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-notes`}>Catatan</Label>
        <Input
          id={`${idPrefix}-notes`}
          name="notes"
          disabled={pending}
          className="h-11"
        />
      </div>
      <PendingSubmitButton pending={pending} className="h-11 w-full">
        Simpan kamar
      </PendingSubmitButton>
    </form>
  );
}
