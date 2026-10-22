import { requireOrg } from "@/lib/tenant";
import { isProActive } from "@/lib/billing/plans";
import { getWhatsAppQuotaUsage } from "@/lib/billing/whatsapp-quota";
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
  const { organization, organizationId, role } = await requireOrg();
  const isOwner = role === "OWNER";
  const pro = isProActive(organization);
  const waQuota = pro ? await getWhatsAppQuotaUsage(organizationId) : null;
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
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Button asChild variant="outline" className="h-11 w-full sm:w-auto">
            <Link href="/panduan">Buka panduan pemilik</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 w-full sm:w-auto">
            <Link href="/staff">Tim & staf</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organisasi & billing</CardTitle>
          <CardDescription>
            Kedua siklus memakai bayar di muka. Tagihan pertama wajib lunas
            sebelum kamar OCCUPIED. Cron membuat tagihan berikutnya di tanggal
            jatuh tempo.
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
            <div className="space-y-2">
              <Label htmlFor="billingCycle">Siklus tagihan sewa</Label>
              <select
                id="billingCycle"
                name="billingCycle"
                required
                defaultValue={organization.billingCycle}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="CALENDAR_PRORATA">
                  Kalender / prorata (serempak di tanggal tetap)
                </option>
                <option value="ANNIVERSARY">
                  Anniversary (mengikuti tanggal masuk)
                </option>
              </select>
              <p className="text-xs text-muted-foreground">
                Prorata: hari check-in tidak dihitung; sisa hari sampai akhir
                bulan × (sewa ÷ hari dalam bulan), lalu bulanan penuh di tanggal
                serempak. Anniversary: sewa penuh tiap tanggal masuk yang dipilih
                di kontrak.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="billingDay">
                  Tanggal serempak (mode kalender)
                </Label>
                <Input
                  id="billingDay"
                  name="billingDay"
                  type="number"
                  min={1}
                  max={28}
                  required
                  defaultValue={organization.billingDay}
                />
                <p className="text-xs text-muted-foreground">
                  Dipakai jika siklus kalender/prorata (biasanya 1). Diabaikan
                  untuk anniversary.
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
                WhatsApp otomatis ada di paket Pro / Pro+.{" "}
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
          <CardTitle>WhatsApp</CardTitle>
          <CardDescription>
            Pengiriman memakai gateway platform SiniKos (Fonnte / Meta / custom).
            Aktifkan centang di atas (paket Pro / Pro+) dan pastikan nomor
            penyewa valid.{" "}
            <Link
              href="/panduan#whatsapp"
              className="font-medium text-primary underline"
            >
              Panduan WhatsApp
            </Link>
            .
          </CardDescription>
        </CardHeader>
        {waQuota && (
          <CardContent className="space-y-2 text-sm">
            <p>
              Pemakaian {waQuota.periodLabel}:{" "}
              <span className="font-medium">
                {waQuota.used} / {waQuota.limit}
              </span>{" "}
              pesan terkirim (hanya yang sukses dihitung).
            </p>
            {waQuota.exhausted ? (
              <p className="text-amber-800">
                Kuota bulan ini habis. Pengiriman otomatis dan tombol Kirim WA
                ditahan sampai bulan berikutnya
                {organization.plan !== "PRO_PLUS"
                  ? ", atau upgrade ke Pro+ untuk kuota lebih besar"
                  : ""}
                .
              </p>
            ) : waQuota.nearLimit ? (
              <p className="text-amber-800">
                Mendekati batas kuota. Sisa {waQuota.remaining} pesan.
              </p>
            ) : (
              <p className="text-muted-foreground">
                Sisa {waQuota.remaining} pesan bulan ini.
              </p>
            )}
          </CardContent>
        )}
      </Card>

      {isOwner ? (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
            <div className="space-y-1.5">
              <CardTitle>Pembayaran online (Midtrans) — opsional</CardTitle>
              <CardDescription>
                Tidak wajib. Tanpa Midtrans Anda tetap bisa menagih dan mencatat
                bayar manual. Jika diaktifkan, uang sewa masuk ke akun Midtrans
                Anda (bukan SiniKos). Perlu paket Pro / Pro+.{" "}
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
              <Badge
                variant={
                  organization.midtransIsProduction ? "warning" : "success"
                }
              >
                {organization.midtransIsProduction ? "Production" : "Sandbox"}
              </Badge>
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
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Pembayaran online (Midtrans)</CardTitle>
            <CardDescription>
              Hanya owner yang dapat mengubah kunci Midtrans. Status saat ini:{" "}
              {organization.midtransEnabled ? "aktif" : "nonaktif"}.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
