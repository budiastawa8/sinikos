import Link from "next/link";
import { requireOrg } from "@/lib/tenant";
import { isProActive } from "@/lib/billing/plans";
import { notificationUrlHint } from "@/lib/payments/midtrans";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const TOC = [
  { id: "mulai", label: "Mulai tanpa Midtrans" },
  { id: "langganan", label: "Paket & langganan" },
  { id: "midtrans", label: "Link bayar Midtrans (opsional)" },
  { id: "sandbox", label: "Uji Sandbox" },
  { id: "production", label: "Pindah ke Production" },
  { id: "whatsapp", label: "WhatsApp tagihan" },
  { id: "masalah", label: "Kalau ada masalah" },
] as const;

export default async function GuidePage() {
  const { organization } = await requireOrg();
  const pro = isProActive(organization);
  const notifyUrl = notificationUrlHint();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Panduan pemilik
        </h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          Cara memakai SiniKos sehari-hari. Midtrans untuk uang sewa bersifat
          opsional — tanpa itu Anda tetap bisa menagih dan mencatat bayar manual.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Daftar isi</CardTitle>
        </CardHeader>
        <CardContent>
          <nav className="flex flex-col gap-1">
            {TOC.map((item, i) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="flex min-h-11 items-center rounded-lg px-3 text-sm text-primary hover:bg-accent"
              >
                {i + 1}. {item.label}
              </a>
            ))}
          </nav>
        </CardContent>
      </Card>

      <GuideSection id="mulai" title="1. Mulai tanpa Midtrans">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Tambah kamar di{" "}
            <Link href="/properties" className="font-medium text-primary underline">
              Properti
            </Link>
            .
          </li>
          <li>
            Daftarkan penyewa di{" "}
            <Link href="/tenants" className="font-medium text-primary underline">
              Penyewa
            </Link>
            , lalu check-in di{" "}
            <Link href="/leases" className="font-medium text-primary underline">
              Kontrak
            </Link>
            .
          </li>
          <li>
            Buat tagihan di{" "}
            <Link href="/invoices" className="font-medium text-primary underline">
              Tagihan
            </Link>{" "}
            → catat bayar manual saat penyewa transfer ke rekening Anda.
          </li>
        </ol>
        <p className="mt-3 text-sm text-muted-foreground">
          Alur ini cukup untuk banyak kos. Link bayar online hanya diperlukan
          jika Anda ingin penyewa bayar lewat VA / e-wallet / QRIS otomatis.
        </p>
      </GuideSection>

      <GuideSection id="langganan" title="2. Paket & langganan">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <span className="font-medium">Gratis:</span> batas properti/kamar/
            kontrak; tagihan dan catat bayar manual.
          </li>
          <li>
            <span className="font-medium">Pro:</span> tanpa batas jumlah, plus
            link bayar Midtrans (jika Anda aktifkan) dan WhatsApp otomatis.
          </li>
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">
          Bayar langganan SiniKos lewat menu Langganan (akun Midtrans platform).
          Itu terpisah dari Midtrans sewa milik Anda.
        </p>
        <p className="mt-2 text-sm">
          Paket Anda sekarang:{" "}
          <span className="font-medium">{pro ? "Pro" : "Gratis"}</span>.
        </p>
        <Button asChild className="mt-4 h-11 w-full sm:w-auto">
          <Link href="/billing">Buka Langganan</Link>
        </Button>
      </GuideSection>

      <GuideSection id="midtrans" title="3. Link bayar Midtrans (opsional)">
        <p className="text-sm text-muted-foreground">
          Hanya jika Anda ingin penyewa bayar online. Uang sewa masuk ke akun
          Midtrans <span className="font-medium text-foreground">Anda</span>,
          bukan ke SiniKos. Butuh paket Pro.
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>
            Daftar Midtrans, lalu buka dashboard{" "}
            <span className="font-medium">Sandbox</span> dulu (
            dashboard.sandbox.midtrans.com).
          </li>
          <li>
            Salin <span className="font-medium">Server Key</span> (dan Client
            Key jika ada).
          </li>
          <li>
            Di SiniKos →{" "}
            <Link href="/settings" className="font-medium text-primary underline">
              Pengaturan
            </Link>
            : matikan Mode Production, tempel key, centang aktifkan link bayar,
            simpan.
          </li>
          <li>
            Di dashboard Midtrans (mode yang sama), set Payment Notification URL
            ke:
            <span className="mt-2 block break-all rounded-md bg-muted px-3 py-2 font-mono text-xs text-foreground">
              {notifyUrl}
            </span>
          </li>
          <li>Aktifkan channel pembayaran yang Anda butuhkan (mis. VA BCA).</li>
        </ol>
        <Button asChild variant="outline" className="mt-4 h-11 w-full sm:w-auto">
          <Link href="/settings">Ke Pengaturan Midtrans</Link>
        </Button>
      </GuideSection>

      <GuideSection id="sandbox" title="4. Uji Sandbox">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Pastikan Mode Production di Pengaturan SiniKos <span className="font-medium">mati</span>.</li>
          <li>Buat atau buka tagihan belum lunas → buat link bayar Midtrans.</li>
          <li>
            Bayar dengan simulator Sandbox Midtrans (mis. VA BCA uji). Tidak
            memakai uang sungguhan.
          </li>
          <li>
            Status tagihan menjadi lunas setelah notifikasi. Jika belum, tekan{" "}
            <span className="font-medium">Cek status bayar</span> di baris
            tagihan.
          </li>
        </ol>
      </GuideSection>

      <GuideSection id="production" title="5. Pindah ke Production">
        <p className="text-sm text-muted-foreground">
          Hanya setelah Sandbox sukses. Production memakai uang sungguhan.
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>Ambil Server Key dari dashboard Midtrans Production (bukan sandbox).</li>
          <li>
            Di SiniKos: centang Mode Production, tempel key Production, simpan.
          </li>
          <li>
            Di dashboard Midtrans Production, set Notification URL yang sama
            seperti di atas, dan aktifkan channel yang sudah disetujui Midtrans.
          </li>
          <li>Uji dengan nominal kecil sebelum dipakai ke semua penyewa.</li>
        </ol>
      </GuideSection>

      <GuideSection id="whatsapp" title="6. WhatsApp tagihan">
        <ul className="list-disc space-y-2 pl-5">
          <li>Tersedia di paket Pro; aktifkan centang WhatsApp di Pengaturan.</li>
          <li>
            Isi &quot;Info pembayaran di pesan WA&quot; (rekening/transfer) agar
            penyewa tahu cara bayar manual.
          </li>
          <li>
            Kirim dari menu Tagihan, atau biarkan cron harian mengirim di tanggal
            tagihan / hari reminder.
          </li>
          <li>
            Pengiriman memakai layanan WhatsApp platform SiniKos (Fonnte). Anda
            tidak perlu mengisi token sendiri.
          </li>
        </ul>
      </GuideSection>

      <GuideSection id="masalah" title="7. Kalau ada masalah">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <span className="font-medium">Link bayar gagal:</span> cek Server Key,
            mode Sandbox/Production cocok, dan channel aktif di Midtrans.
          </li>
          <li>
            <span className="font-medium">Sudah bayar tapi belum lunas:</span>{" "}
            pastikan Notification URL benar, lalu pakai Cek status bayar. Atau
            catat bayar manual.
          </li>
          <li>
            <span className="font-medium">WA gagal:</span> pastikan paket Pro,
            WhatsApp aktif di Pengaturan, dan nomor penyewa valid (08… / 62…).
          </li>
          <li>
            <span className="font-medium">Batas Gratis:</span> upgrade di Langganan
            atau kurangi data aktif (check-out, dll.).
          </li>
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">
          Setup akun Midtrans (daftar, KYC, channel) adalah tanggung jawab pemilik
          kos. SiniKos memastikan aplikasi dan panduan ini jelas.
        </p>
      </GuideSection>
    </div>
  );
}

function GuideSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-20">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm leading-relaxed">{children}</CardContent>
    </Card>
  );
}
