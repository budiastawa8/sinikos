"use client";

import { useTransition } from "react";
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
          toast.success("Pengaturan Midtrans disimpan");
        });
      }}
    >
      <div className="flex items-center gap-2">
        <input
          id="midtransEnabled"
          name="midtransEnabled"
          type="checkbox"
          defaultChecked={enabled}
          className="size-4 rounded border"
        />
        <Label htmlFor="midtransEnabled">Aktifkan link bayar Midtrans</Label>
      </div>
      <div className="flex items-center gap-2">
        <input
          id="midtransIsProduction"
          name="midtransIsProduction"
          type="checkbox"
          defaultChecked={isProduction}
          className="size-4 rounded border"
        />
        <Label htmlFor="midtransIsProduction">
          Mode Production (matikan untuk Sandbox)
        </Label>
      </div>

      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
        Mode ditentukan checkbox di atas, bukan awalan key. Untuk Sandbox:
        matikan Production, salin Server/Client Key dari{" "}
        <span className="font-medium">dashboard.sandbox.midtrans.com</span>, lalu
        simpan. Key Sandbox dan Production bisa tampak mirip (
        <code className="rounded bg-white/80 px-1">Mid-server-…</code>
        ).
      </p>

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
              : "Mid-server-…"
          }
        />
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
              : "Mid-client-…"
          }
        />
      </div>

      <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Notification URL</p>
        <p className="mt-1 break-all font-mono text-xs">{notifyUrl}</p>
        <p className="mt-2">
          Di dashboard Midtrans yang sama dengan mode (Sandbox/Production):
          tempel sebagai Payment Notification URL, lalu aktifkan payment
          channels.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="clearMidtransKeys"
          name="clearMidtransKeys"
          type="checkbox"
          className="size-4 rounded border"
        />
        <Label htmlFor="clearMidtransKeys">
          Hapus key tersimpan & nonaktifkan Midtrans
        </Label>
      </div>

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Menyimpan..." : "Simpan Midtrans"}
      </Button>
    </form>
  );
}
