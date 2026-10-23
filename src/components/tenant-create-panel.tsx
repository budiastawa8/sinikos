"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createTenantAction } from "@/lib/actions/properties";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

function TenantCreateFields({
  idPrefix,
  pending,
  onSubmit,
}: {
  idPrefix: string;
  pending: boolean;
  onSubmit: (formData: FormData) => void;
}) {
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(new FormData(e.currentTarget));
      }}
    >
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-name`}>Nama</Label>
        <Input
          id={`${idPrefix}-name`}
          name="name"
          required
          minLength={2}
          className="h-11"
          disabled={pending}
          autoComplete="name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-phone`}>Nomor WhatsApp</Label>
        <Input
          id={`${idPrefix}-phone`}
          name="phone"
          required
          minLength={9}
          placeholder="0812xxxxxxx"
          inputMode="tel"
          autoComplete="tel"
          className="h-11"
          disabled={pending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-email`}>Email (opsional)</Label>
        <Input
          id={`${idPrefix}-email`}
          name="email"
          type="email"
          className="h-11"
          disabled={pending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-notes`}>Catatan</Label>
        <Input
          id={`${idPrefix}-notes`}
          name="notes"
          className="h-11"
          disabled={pending}
        />
      </div>
      <Button type="submit" className="h-11 w-full" disabled={pending}>
        {pending ? "Menyimpan…" : "Simpan"}
      </Button>
    </form>
  );
}

function useCreateTenant() {
  const router = useRouter();
  const [pending, start] = useTransition();

  function submit(formData: FormData, onSuccess?: () => void) {
    start(async () => {
      try {
        await createTenantAction(formData);
        toast.success("Penyewa ditambahkan");
        onSuccess?.();
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
      }
    });
  }

  return { pending, submit };
}

/** Tombol + sheet untuk mobile saat daftar sudah ada. */
export function TenantCreateSheetTrigger() {
  const [open, setOpen] = useState(false);
  const { pending, submit } = useCreateTenant();

  useEffect(() => {
    function syncFromHash() {
      if (window.location.hash === "#tambah-penyewa") {
        setOpen(true);
      }
    }
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next && window.location.hash === "#tambah-penyewa") {
          history.replaceState(null, "", window.location.pathname);
        }
      }}
    >
      <SheetTrigger asChild>
        <Button type="button" className="h-10 shrink-0 gap-1.5">
          <Plus className="size-4" />
          Tambah
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="gap-0 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <SheetHeader className="pb-3">
          <SheetTitle>Tambah penyewa</SheetTitle>
          <SheetDescription>
            Simpan nama dan nomor WhatsApp untuk tagihan.
          </SheetDescription>
        </SheetHeader>
        <div className="px-3 pb-4">
          <TenantCreateFields
            idPrefix="tenant-sheet"
            pending={pending}
            onSubmit={(fd) => submit(fd, () => setOpen(false))}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Form kartu — tampil di desktop, atau di semua ukuran jika daftar kosong. */
export function TenantCreateCard({
  className,
}: {
  className?: string;
}) {
  const { pending, submit } = useCreateTenant();

  return (
    <Card id="tambah-penyewa" className={className}>
      <CardHeader>
        <CardTitle>Tambah penyewa</CardTitle>
      </CardHeader>
      <CardContent>
        <TenantCreateFields
          idPrefix="tenant-card"
          pending={pending}
          onSubmit={(fd) => submit(fd)}
        />
      </CardContent>
    </Card>
  );
}
