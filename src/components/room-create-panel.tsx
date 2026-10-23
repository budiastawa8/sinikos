"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanLimitNotice } from "@/components/plan-limit-notice";
import { RoomCreateForm } from "@/components/room-create-form";
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

type Props = {
  propertyId: string;
  atRoomLimit: boolean;
  usageLabel?: string;
};

export function RoomCreateSheetTrigger({
  propertyId,
  atRoomLimit,
  usageLabel,
}: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function syncFromHash() {
      if (window.location.hash === "#tambah-kamar") {
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
        if (!next && window.location.hash === "#tambah-kamar") {
          history.replaceState(
            null,
            "",
            window.location.pathname + window.location.search,
          );
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
          <SheetTitle>Tambah kamar</SheetTitle>
          <SheetDescription>
            Isi kode kamar dan harga sewa bulanan.
            {usageLabel ? ` ${usageLabel}` : ""}
          </SheetDescription>
        </SheetHeader>
        <div className="px-3 pb-4">
          {atRoomLimit ? (
            <PlanLimitNotice>
              Batas kamar paket Gratis sudah tercapai. Kamar yang sudah ada
              tetap bisa diubah statusnya.
            </PlanLimitNotice>
          ) : (
            <RoomCreateForm
              propertyId={propertyId}
              idPrefix="room-sheet"
              onSuccess={() => setOpen(false)}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function RoomCreateCard({
  propertyId,
  atRoomLimit,
  usageLabel,
  className,
}: Props & { className?: string }) {
  return (
    <Card id="tambah-kamar" className={className}>
      <CardHeader>
        <CardTitle>Tambah kamar</CardTitle>
        {usageLabel && <CardDescription>{usageLabel}</CardDescription>}
      </CardHeader>
      <CardContent>
        {atRoomLimit ? (
          <PlanLimitNotice>
            Batas kamar paket Gratis sudah tercapai. Kamar yang sudah ada tetap
            bisa diubah statusnya.
          </PlanLimitNotice>
        ) : (
          <RoomCreateForm propertyId={propertyId} idPrefix="room-card" />
        )}
      </CardContent>
    </Card>
  );
}
