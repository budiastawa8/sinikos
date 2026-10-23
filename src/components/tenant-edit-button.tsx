"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateTenantAction } from "@/lib/actions/properties";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type Props = {
  id: string;
  name: string;
  phone: string;
  /** Lebar penuh untuk kartu mobile. */
  fullWidth?: boolean;
};

export function TenantEditButton({ id, name, phone, fullWidth }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [draftName, setDraftName] = useState(name);
  const [draftPhone, setDraftPhone] = useState(phone);

  useEffect(() => {
    if (open) {
      setDraftName(name);
      setDraftPhone(phone);
    }
  }, [open, name, phone]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    start(async () => {
      try {
        await updateTenantAction(formData);
        toast.success("Data penyewa disimpan");
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={fullWidth ? "h-10 w-full" : "h-10"}
        >
          Edit
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="gap-0 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <SheetHeader className="pb-3">
          <SheetTitle>Edit penyewa</SheetTitle>
          <SheetDescription>
            Perbaiki nama atau nomor WhatsApp. Perubahan dipakai di tagihan dan
            kontrak.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="space-y-4 px-3 pb-4">
          <input type="hidden" name="id" value={id} />
          <div className="space-y-2">
            <Label htmlFor={`edit-name-${id}`}>Nama</Label>
            <Input
              id={`edit-name-${id}`}
              name="name"
              required
              minLength={2}
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              autoComplete="name"
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit-phone-${id}`}>Nomor WhatsApp</Label>
            <Input
              id={`edit-phone-${id}`}
              name="phone"
              required
              minLength={9}
              value={draftPhone}
              onChange={(e) => setDraftPhone(e.target.value)}
              placeholder="0812xxxxxxx"
              inputMode="tel"
              autoComplete="tel"
              className="h-11"
            />
          </div>
          <Button type="submit" className="h-11 w-full" disabled={pending}>
            {pending ? "Menyimpan…" : "Simpan"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
