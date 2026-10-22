import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SubscriptionDonePage() {
  return (
    <main className="flex w-full flex-1 items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md shadow-md">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">
            Pembayaran langganan diproses
          </CardTitle>
          <CardDescription>
            Jika pembayaran berhasil, paket Pro aktif setelah konfirmasi
            Midtrans. Buka menu Langganan untuk melihat masa berlaku. Di
            Sandbox, selesaikan pembayaran di simulator lalu cek status.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button asChild className="h-11 w-full">
            <Link href="/billing">Ke halaman Langganan</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 w-full">
            <Link href="/dashboard">Ke dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
