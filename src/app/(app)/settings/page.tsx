import { requireOrg } from "@/lib/tenant";
import {
  updateMidtransSettingsAction,
  updateSettingsAction,
} from "@/lib/actions/settings";
import { notificationUrlHint } from "@/lib/payments/midtrans";
import { decryptSecret, maskSecret } from "@/lib/crypto/secrets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function storedKeyHint(enc: string | null | undefined) {
  if (!enc) return null;
  try {
    return maskSecret(decryptSecret(enc));
  } catch {
    return "•••• (tersimpan)";
  }
}

export default async function SettingsPage() {
  const { organization } = await requireOrg();
  const serverHint = storedKeyHint(organization.midtransServerKeyEnc);
  const clientHint = storedKeyHint(organization.midtransClientKeyEnc);
  const notifyUrl = notificationUrlHint();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Pengaturan
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Bisnis, jadwal tagihan, WhatsApp, dan Midtrans milik organisasi Anda.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organisasi & billing</CardTitle>
          <CardDescription>
            Cron harian akan generate tagihan pada tanggal yang dipilih dan
            mengirim WhatsApp jika diaktifkan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateSettingsAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama bisnis</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={organization.name}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="billingDay">Tanggal tagihan tiap bulan</Label>
                <Input
                  id="billingDay"
                  name="billingDay"
                  type="number"
                  min={1}
                  max={28}
                  required
                  defaultValue={organization.billingDay}
                />
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
                  defaultValue={organization.reminderDaysBefore}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="whatsappEnabled"
                name="whatsappEnabled"
                type="checkbox"
                defaultChecked={organization.whatsappEnabled}
                className="size-4 rounded border"
              />
              <Label htmlFor="whatsappEnabled">Aktifkan WhatsApp otomatis</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsappPayInfo">Info pembayaran di pesan WA</Label>
              <Textarea
                id="whatsappPayInfo"
                name="whatsappPayInfo"
                rows={4}
                defaultValue={organization.whatsappPayInfo}
              />
            </div>
            <Button type="submit">Simpan pengaturan</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integrasi Fonnte</CardTitle>
          <CardDescription>
            Token Fonnte dikonfigurasi lewat environment variable{" "}
            <code className="rounded bg-muted px-1">FONNTE_TOKEN</code> di
            Vercel / lokal (saat ini tingkat platform).
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
          <div className="space-y-1.5">
            <CardTitle>Pembayaran online (Midtrans)</CardTitle>
            <CardDescription>
              Model B: tiap pemilik kos memakai akun Midtrans sendiri. Uang sewa
              masuk ke Midtrans Anda, bukan ke platform SiniKos.
            </CardDescription>
          </div>
          {organization.midtransEnabled && serverHint ? (
            <Badge variant="success">Aktif</Badge>
          ) : (
            <Badge variant="secondary">Nonaktif</Badge>
          )}
        </CardHeader>
        <CardContent>
          <form action={updateMidtransSettingsAction} className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                id="midtransEnabled"
                name="midtransEnabled"
                type="checkbox"
                defaultChecked={organization.midtransEnabled}
                className="size-4 rounded border"
              />
              <Label htmlFor="midtransEnabled">
                Aktifkan link bayar Midtrans
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="midtransIsProduction"
                name="midtransIsProduction"
                type="checkbox"
                defaultChecked={organization.midtransIsProduction}
                className="size-4 rounded border"
              />
              <Label htmlFor="midtransIsProduction">
                Mode Production (matikan untuk Sandbox / SB-…)
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="midtransServerKey">Server Key</Label>
              <Input
                id="midtransServerKey"
                name="midtransServerKey"
                type="password"
                autoComplete="off"
                placeholder={
                  serverHint
                    ? `Tersimpan: ${serverHint} — isi untuk diganti`
                    : "Mid-server-… atau SB-Mid-server-…"
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
                    : "Mid-client-… atau SB-Mid-client-…"
                }
              />
            </div>

            <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Notification URL</p>
              <p className="mt-1 break-all font-mono text-xs">{notifyUrl}</p>
              <p className="mt-2">
                Di dashboard Midtrans Anda: Settings → Configuration → tempel URL
                di atas. Aktifkan juga payment channels (VA / e-wallet / QRIS).
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

            <Button type="submit">Simpan Midtrans</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
