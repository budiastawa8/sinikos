import { requireOrg } from "@/lib/tenant";
import { isProActive } from "@/lib/billing/plans";
import { updateSettingsAction } from "@/lib/actions/settings";
import { notificationUrlHint } from "@/lib/payments/midtrans";
import { decryptSecret, maskSecret } from "@/lib/crypto/secrets";
import { MidtransSettingsForm } from "@/components/midtrans-settings-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
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
  const pro = isProActive(organization);
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
          Bisnis, jadwal tagihan, WhatsApp, dan Midtrans opsional untuk uang
          sewa.
        </p>
        <Button asChild variant="outline" className="mt-3 h-11 w-full sm:w-auto">
          <Link href="/panduan">Buka panduan pemilik</Link>
        </Button>
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
            <div className="flex min-h-10 items-center gap-3">
              <input
                id="whatsappEnabled"
                name="whatsappEnabled"
                type="checkbox"
                defaultChecked={pro && organization.whatsappEnabled}
                disabled={!pro}
                className="size-5 rounded border"
              />
              <Label htmlFor="whatsappEnabled">Aktifkan WhatsApp otomatis</Label>
            </div>
            {!pro && (
              <p className="text-sm text-muted-foreground">
                WhatsApp otomatis ada di paket Pro.{" "}
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
                defaultValue={organization.whatsappPayInfo}
              />
            </div>
            <Button type="submit">Simpan pengaturan</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>WhatsApp (Fonnte)</CardTitle>
          <CardDescription>
            Pengiriman WhatsApp memakai layanan platform SiniKos. Anda cukup
            mengaktifkan centang di atas (paket Pro) dan memastikan nomor
            penyewa valid. Detail ada di{" "}
            <Link
              href="/panduan#whatsapp"
              className="font-medium text-primary underline"
            >
              panduan WhatsApp
            </Link>
            .
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
          <div className="space-y-1.5">
            <CardTitle>Pembayaran online (Midtrans) — opsional</CardTitle>
            <CardDescription>
              Tidak wajib. Tanpa Midtrans Anda tetap bisa menagih dan mencatat
              bayar manual. Jika diaktifkan, uang sewa masuk ke akun Midtrans
              Anda (bukan SiniKos). Perlu paket Pro.{" "}
              <Link
                href="/panduan#midtrans"
                className="font-medium text-primary underline"
              >
                Panduan setup.
              </Link>
              {!pro && (
                <>
                  {" "}
                  <Link
                    href="/billing"
                    className="font-medium text-primary underline"
                  >
                    Lihat langganan.
                  </Link>
                </>
              )}
            </CardDescription>
          </div>
          {organization.midtransEnabled && serverHint ? (
            <Badge variant="success">Aktif</Badge>
          ) : (
            <Badge variant="secondary">Nonaktif</Badge>
          )}
        </CardHeader>
        <CardContent>
          <MidtransSettingsForm
            enabled={organization.midtransEnabled}
            isProduction={organization.midtransIsProduction}
            serverHint={serverHint}
            clientHint={clientHint}
            notifyUrl={notifyUrl}
          />
        </CardContent>
      </Card>
    </div>
  );
}
