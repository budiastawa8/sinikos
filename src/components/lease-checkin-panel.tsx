"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { checkInAction } from "@/lib/actions/leases";
import { formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlanLimitNotice } from "@/components/plan-limit-notice";
import {
  Card,
  CardContent,
  CardDescription,
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

export type CheckInTenantOption = { id: string; name: string };
export type CheckInRoomOption = {
  id: string;
  code: string;
  price: number;
  propertyName: string;
};

type PanelProps = {
  isAnniversary: boolean;
  atLeaseLimit: boolean;
  usageLabel?: string;
  tenants: CheckInTenantOption[];
  rooms: CheckInRoomOption[];
  addRoomsHref: string;
};

function CheckInFields({
  idPrefix,
  isAnniversary,
  tenants,
  rooms,
  pending,
  onSubmit,
}: {
  idPrefix: string;
  isAnniversary: boolean;
  tenants: CheckInTenantOption[];
  rooms: CheckInRoomOption[];
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
        <Label htmlFor={`${idPrefix}-tenantId`}>Penyewa</Label>
        <select
          id={`${idPrefix}-tenantId`}
          name="tenantId"
          required
          disabled={pending}
          className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
        >
          <option value="">Pilih penyewa</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-roomId`}>Kamar tersedia</Label>
        <select
          id={`${idPrefix}-roomId`}
          name="roomId"
          required
          disabled={pending}
          className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
        >
          <option value="">Pilih kamar</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.propertyName} · {r.code} ({formatRupiah(r.price)})
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-startDate`}>Tanggal masuk</Label>
        <Input
          id={`${idPrefix}-startDate`}
          name="startDate"
          type="date"
          required
          className="h-11"
          disabled={pending}
        />
        {isAnniversary && (
          <p className="text-xs text-muted-foreground">
            Tanggal ini menjadi siklus tagihan bulanan (maks. hari ke-28 untuk
            bulan pendek).
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-monthlyRent`}>Sewa / bulan</Label>
        <Input
          id={`${idPrefix}-monthlyRent`}
          name="monthlyRent"
          type="number"
          required
          min={1}
          placeholder="1500000"
          className="h-11"
          disabled={pending}
        />
      </div>
      <Button type="submit" className="h-11 w-full" disabled={pending}>
        {pending ? "Memproses…" : "Buat check-in + tagihan"}
      </Button>
    </form>
  );
}

function useCheckIn() {
  const router = useRouter();
  const [pending, start] = useTransition();

  function submit(formData: FormData, onSuccess?: () => void) {
    start(async () => {
      try {
        await checkInAction(formData);
        toast.success("Check-in dibuat");
        onSuccess?.();
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal check-in");
      }
    });
  }

  return { pending, submit };
}

function CheckInDescription({
  isAnniversary,
  usageLabel,
}: {
  isAnniversary: boolean;
  usageLabel?: string;
}) {
  return (
    <>
      <SheetDescription className="text-left">
        {isAnniversary
          ? "Pilih tanggal masuk — tagihan penuh berulang di tanggal itu."
          : "Masuk di tengah bulan: prorata harian (hari masuk tidak dihitung), lalu serempak di tanggal tagihan."}{" "}
        Tagihan pertama wajib lunas sebelum kamar terisi.
      </SheetDescription>
      {usageLabel && (
        <p className="text-sm text-muted-foreground">{usageLabel}</p>
      )}
    </>
  );
}

function CheckInBody({
  idPrefix,
  isAnniversary,
  atLeaseLimit,
  tenants,
  rooms,
  addRoomsHref,
  pending,
  onSubmit,
}: PanelProps & {
  idPrefix: string;
  pending: boolean;
  onSubmit: (formData: FormData) => void;
}) {
  if (atLeaseLimit) {
    return (
      <PlanLimitNotice>
        Batas kontrak paket Gratis sudah tercapai. Check-out atau batalkan
        check-in menunggu bayar dulu.
      </PlanLimitNotice>
    );
  }

  if (tenants.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Belum ada penyewa. Daftarkan penyewa dulu sebelum check-in.
        </p>
        <Button asChild className="h-11 w-full">
          <Link href="/tenants">Ke penyewa</Link>
        </Button>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Tidak ada kamar kosong. Tambah kamar baru atau check-out penyewa yang
          sudah selesai.
        </p>
        <Button asChild className="h-11 w-full">
          <Link href={addRoomsHref}>Kelola kamar</Link>
        </Button>
      </div>
    );
  }

  return (
    <CheckInFields
      idPrefix={idPrefix}
      isAnniversary={isAnniversary}
      tenants={tenants}
      rooms={rooms}
      pending={pending}
      onSubmit={onSubmit}
    />
  );
}

export function LeaseCheckInSheetTrigger(props: PanelProps) {
  const [open, setOpen] = useState(false);
  const { pending, submit } = useCheckIn();
  const { isAnniversary, usageLabel } = props;

  useEffect(() => {
    function syncFromHash() {
      if (window.location.hash === "#check-in") {
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
        if (!next && window.location.hash === "#check-in") {
          history.replaceState(null, "", window.location.pathname);
        }
      }}
    >
      <SheetTrigger asChild>
        <Button type="button" className="h-10 shrink-0 gap-1.5 px-3">
          <Plus className="size-4" />
          Tambah
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="max-h-[90vh] gap-0 overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <SheetHeader className="pb-3">
          <SheetTitle>Check-in baru</SheetTitle>
          <CheckInDescription
            isAnniversary={isAnniversary}
            usageLabel={usageLabel}
          />
        </SheetHeader>
        <div className="px-3 pb-4">
          <CheckInBody
            {...props}
            idPrefix="lease-sheet"
            pending={pending}
            onSubmit={(fd) => submit(fd, () => setOpen(false))}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function LeaseCheckInCard({
  className,
  ...props
}: PanelProps & { className?: string }) {
  const { pending, submit } = useCheckIn();
  const { isAnniversary, usageLabel } = props;

  return (
    <Card id="check-in" className={className}>
      <CardHeader>
        <CardTitle>Check-in baru</CardTitle>
        <CardDescription>
          {isAnniversary
            ? "Pilih tanggal masuk — tagihan penuh berulang di tanggal itu."
            : "Masuk di tengah bulan: prorata harian (hari masuk tidak dihitung), lalu serempak di tanggal tagihan."}{" "}
          Tagihan pertama wajib lunas sebelum kamar terisi.
        </CardDescription>
        {usageLabel && <CardDescription>{usageLabel}</CardDescription>}
      </CardHeader>
      <CardContent>
        <CheckInBody
          {...props}
          idPrefix="lease-card"
          pending={pending}
          onSubmit={(fd) => submit(fd)}
        />
      </CardContent>
    </Card>
  );
}
