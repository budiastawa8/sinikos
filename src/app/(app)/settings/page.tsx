import { requireOrg } from "@/lib/tenant";
import { isPlatformAdminEmail } from "@/lib/platform-admin";
import { isProActive } from "@/lib/billing/plans";
import { getWhatsAppQuotaUsage } from "@/lib/billing/whatsapp-quota";
import { notificationUrlHint } from "@/lib/payments/midtrans";
import { decryptSecret, maskSecret } from "@/lib/crypto/secrets";
import { MidtransSettingsForm } from "@/components/midtrans-settings-form";
import { SettingsForm } from "@/components/settings-form";
import { Button } from "@/components/ui/button";
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
  const { organization, organizationId, role, session } = await requireOrg();
  const isOwner = role === "OWNER";
  const isPlatformAdmin = isPlatformAdminEmail(session.user?.email);
  const pro = isProActive(organization);
  const waQuota = await getWhatsAppQuotaUsage(organizationId);
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
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button asChild variant="outline" className="h-11 w-full sm:w-auto">
            <Link href="/panduan">Buka panduan pemilik</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 w-full sm:w-auto">
            <Link href="/staff">Tim & staf</Link>
          </Button>
          {isPlatformAdmin ? (
            <Button asChild variant="secondary" className="h-11 w-full sm:w-auto">
              <Link href="/admin">Panel platform</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organisasi & billing</CardTitle>
          <CardDescription>
            Kedua siklus memakai bayar di muka. Tagihan pertama wajib lunas
            sebelum kamar terisi. Cron membuat tagihan berikutnya di tanggal
            jatuh tempo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm
            name={organization.name}
            billingCycle={organization.billingCycle}
            billingDay={organization.billingDay}
            reminderDaysBefore={organization.reminderDaysBefore}
            whatsappEnabled={organization.whatsappEnabled}
            whatsappPayInfo={organization.whatsappPayInfo}
            pro={pro}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>WhatsApp</CardTitle>
          <CardDescription>
            Pengiriman memakai gateway platform SiniKos (Fonnte / Meta / custom).
            Pastikan nomor penyewa valid. Reminder otomatis butuh centang di atas
            + paket Pro.{" "}
            <Link
              href="/panduan#whatsapp"
              className="font-medium text-primary underline"
            >
              Panduan WhatsApp
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Pemakaian {waQuota.periodLabel}:{" "}
            <span className="font-medium">
              {waQuota.used} / {waQuota.limit}
            </span>{" "}
            pesan terkirim (hanya yang sukses dihitung)
            {!pro ? " — paket Gratis, kirim manual" : ""}.
          </p>
          {waQuota.exhausted ? (
            <p className="text-amber-800">
              Kuota bulan ini habis. Tombol Kirim WA ditahan sampai bulan
              berikutnya
              {!pro
                ? ", atau upgrade ke Pro untuk kuota lebih besar dan reminder otomatis"
                : waQuota.plan !== "PRO_PLUS"
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
