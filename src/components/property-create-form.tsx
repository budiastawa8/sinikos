"use client";

import { createPropertyAction } from "@/lib/actions/properties";
import { useServerAction } from "@/hooks/use-server-action";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingSubmitButton } from "@/components/pending-submit-button";

export function PropertyCreateForm() {
  const { pending, onSubmit } = useServerAction(createPropertyAction, {
    success: "Properti disimpan",
    error: "Gagal menyimpan properti",
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nama kos</Label>
        <Input id="name" name="name" required disabled={pending} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Alamat</Label>
        <Input id="address" name="address" disabled={pending} />
      </div>
      <PendingSubmitButton
        pending={pending}
        className="h-11 w-full sm:w-auto"
      >
        Simpan
      </PendingSubmitButton>
    </form>
  );
}
