import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function PaymentDonePage() {
  return (
    <main className="flex w-full flex-1 items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md shadow-md">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">Pembayaran diproses</CardTitle>
          <CardDescription>
            Jika pembayaran berhasil, status tagihan akan otomatis menjadi lunas
            setelah konfirmasi dari Midtrans. Anda bisa menutup halaman ini.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/">Kembali ke SiniKos</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
