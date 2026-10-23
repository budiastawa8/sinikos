"use client";

import Link from "next/link";
import { updateSettingsAction } from "@/lib/actions/settings";
import { useServerAction } from "@/hooks/use-server-action";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PendingSubmitButton } from "@/components/pending-submit-button";

type Props = {
  name: string;
  billingCycle: string;
  billingDay: number;
  reminderDaysBefore: number;
  whatsappEnabled: boolean;
  whatsappPayInfo: string;
  pro: boolean;
};

export function SettingsForm({
  name,
  billingCycle,
  billingDay,
  reminderDaysBefore,
  whatsappEnabled,
  whatsappPayInfo,
  pro,
}: Props) {
  const { pending, onSubmit } = useServerAction(updateSettingsAction, {
    success: "Pengaturan disimpan",
    error: "Gagal menyimpan pengaturan",
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nama bisnis</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={name}
          disabled={pending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="billingCycle">Siklus tagihan sewa</Label>
        <select
          id="billingCycle"
          name="billingCycle"
          required
          defaultValue={billingCycle}
          disabled={pending}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
        >
          <option value="CALENDAR_PRORATA">
            Kalender / prorata (serempak di tanggal tetap)
          </option>
          <option value="ANNIVERSARY">
            Anniversary (mengikuti tanggal masuk)
          </option>
        </select>
        <p className="text-xs text-muted-foreground">
          Prorata: hari check-in tidak dihitung; sisa hari sampai akhir bulan ×
          (sewa ÷ hari dalam bulan), lalu bulanan penuh di tanggal serempak.
          Anniversary: sewa penuh tiap tanggal masuk yang dipilih di kontrak.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="billingDay">Tanggal serempak (mode kalender)</Label>
          <Input
            id="billingDay"
            name="billingDay"
            type="number"
            min={1}
            max={28}
            required
            defaultValue={billingDay}
            disabled={pending}
          />
          <p className="text-xs text-muted-foreground">
            Dipakai jika siklus kalender/prorata (biasanya 1). Diabaikan untuk
            anniversary.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="reminderDaysBefore">
            Reminder WA (hari sebelum jatuh tempo)
          </Label>
          <Input
            id="reminderDaysBefore"
            name="reminderDaysBefore"
            type="number"
            min={0}
            max={14}
            required
            defaultValue={reminderDaysBefore}
            disabled={pending}
          />
        </div>
      </div>
      <div className="flex min-h-10 items-center gap-3">
        <input
          id="whatsappEnabled"
          name="whatsappEnabled"
          type="checkbox"
          defaultChecked={pro && whatsappEnabled}
          disabled={!pro || pending}
          className="size-5 rounded border"
        />
        <Label htmlFor="whatsappEnabled">Aktifkan WhatsApp otomatis</Label>
      </div>
      {!pro && (
        <p className="text-sm text-muted-foreground">
          Reminder WhatsApp otomatis ada di Pro / Pro+. Paket Gratis tetap bisa
          kirim WA manual dari Tagihan (kuota terbatas).{" "}
          <Link href="/billing" className="font-medium text-primary underline">
            Lihat langganan.
          </Link>
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="whatsappPayInfo">Info pembayaran di pesan WA</Label>
        <Textarea
          id="whatsappPayInfo"
          name="whatsappPayInfo"
          rows={4}
          defaultValue={whatsappPayInfo}
          disabled={pending}
        />
      </div>
      <PendingSubmitButton pending={pending} className="h-11 w-full sm:w-auto">
        Simpan pengaturan
      </PendingSubmitButton>
    </form>
  );
}
