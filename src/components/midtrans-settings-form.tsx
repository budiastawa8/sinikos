"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateMidtransSettingsAction } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  enabled: boolean;
  isProduction: boolean;
  serverHint: string | null;
  clientHint: string | null;
  notifyUrl: string;
};

export function MidtransSettingsForm({
  enabled,
  isProduction,
  serverHint,
  clientHint,
  notifyUrl,
}: Props) {
  const [pending, start] = useTransition();
  const [productionOn, setProductionOn] = useState(isProduction);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const result = await updateMidtransSettingsAction(fd);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success(
            productionOn
              ? "Midtrans Production disimpan — transaksi memakai uang sungguhan"
              : "Pengaturan Midtrans disimpan",
          );
        });
      }}
    >
      <p className="text-sm text-muted-foreground">
        Opsional. Tanpa Midtrans, tagihan dan catat bayar manual tetap bisa
        dipakai.{" "}
        <Link
          href="/panduan#midtrans"
          className="font-medium text-primary underline"
        >
          Lihat panduan langkah demi langkah.
        </Link>
      </p>

      <div className="rounded-lg border bg-muted/40 px-3 py-3 text-sm">
        <p className="font-medium text-foreground">Checklist sebelum Production</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>Sandbox sudah berhasil sampai tagihan berstatus PAID.</li>
          <li>
            Key diambil dari{" "}
            <span className="font-medium text-foreground">dashboard.midtrans.com</span>{" "}
            (Production), bukan sandbox.
          </li>
          <li>Notification URL di dashboard Production sama dengan di bawah.</li>
          <li>Channel (mis. VA BCA) sudah disetujui / aktif di Production.</li>
          <li>Uji dulu dengan nominal kecil ke satu penyewa.</li>
        </ol>
        <p className="mt-2">
          <Link
            href="/panduan#production"
            className="font-medium text-primary underline"
          >
            Panduan pindah ke Production
          </Link>
        </p>
      </div>

      <div className="flex min-h-10 items-center gap-3">
        <input
          id="midtransEnabled"
          name="midtransEnabled"
          type="checkbox"
          defaultChecked={enabled}
          className="size-5 rounded border"
        />
        <Label htmlFor="midtransEnabled">Aktifkan link bayar Midtrans</Label>
      </div>

      <div className="flex min-h-10 items-center gap-3">
        <input
          id="midtransIsProduction"
          name="midtransIsProduction"
          type="checkbox"
          checked={productionOn}
          onChange={(e) => setProductionOn(e.target.checked)}
          className="size-5 rounded border"
        />
        <Label htmlFor="midtransIsProduction">
          Mode Production (matikan untuk Sandbox)
        </Label>
      </div>

      {productionOn ? (
        <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-950">
          <p className="font-medium">Mode Production — uang sungguhan</p>
          <p>
            Penyewa yang membayar lewat link akan ditagih nyata. Pastikan Sandbox
            sudah lulus, Notification URL Production benar, dan Anda menempel{" "}
            <span className="font-medium">Server Key Production</span> (bukan
            key berawalan <code className="rounded bg-white/80 px-1">SB-</code>
            ).
          </p>
          {!isProduction && (
            <div className="flex min-h-10 items-start gap-3">
              <input
                id="acknowledgeProduction"
                name="acknowledgeProduction"
                type="checkbox"
                className="mt-1 size-5 shrink-0 rounded border"
                required
              />
              <Label htmlFor="acknowledgeProduction" className="leading-snug">
                Saya sudah uji Sandbox sampai lunas, paham ini uang sungguhan,
                dan akan menempel key Production.
              </Label>
            </div>
          )}
        </div>
      ) : (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
          Mode Sandbox: tidak memotong uang sungguhan. Ambil key dari{" "}
          <span className="font-medium">dashboard.sandbox.midtrans.com</span>.
          Key bisa berawalan{" "}
          <code className="rounded bg-white/80 px-1">SB-Mid-server-…</code> atau{" "}
          <code className="rounded bg-white/80 px-1">Mid-server-…</code>.
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="midtransServerKey">Server Key</Label>
        <Input
          id="midtransServerKey"
          name="midtransServerKey"
          type="password"
          autoComplete="off"
          placeholder={
            serverHint
              ? `Tersimpan: ${serverHint} — isi ulang jika ganti akun/mode`
              : productionOn
                ? "Mid-server-… (Production)"
                : "SB-Mid-server-… atau Mid-server-…"
          }
        />
        {productionOn && !isProduction && (
          <p className="text-xs text-muted-foreground">
            Wajib tempel ulang key Production saat pertama kali mengaktifkan mode
            ini.
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="midtransClientKey">Client Key (opsional)</Label>
        <Input
          id="midtransClientKey"
          name="midtransClientKey"
          type="password"
          autoComplete="off"
          placeholder={
            clientHint
              ? `Tersimpan: ${clientHint} — isi untuk diganti`
              : productionOn
                ? "Mid-client-… (Production)"
                : "Mid-client-…"
          }
        />
      </div>

      <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Notification URL</p>
        <p className="mt-1 break-all font-mono text-xs text-foreground">
          {notifyUrl}
        </p>
        <p className="mt-2">
          Tempel di dashboard Midtrans{" "}
          <span className="font-medium text-foreground">
            {productionOn ? "Production" : "Sandbox"}
          </span>{" "}
          → Settings → Payment Notification URL, lalu aktifkan channel yang
          dipakai.
        </p>
      </div>

      <div className="flex min-h-10 items-center gap-3">
        <input
          id="clearMidtransKeys"
          name="clearMidtransKeys"
          type="checkbox"
          className="size-5 rounded border"
        />
        <Label htmlFor="clearMidtransKeys">
          Hapus key tersimpan & nonaktifkan Midtrans
        </Label>
      </div>

      <Button type="submit" disabled={pending} className="h-11 w-full sm:w-auto">
        {pending ? "Menyimpan..." : "Simpan Midtrans"}
      </Button>
    </form>
  );
}
