import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect(session.user.organizationId ? "/dashboard" : "/onboarding");
  }

  return (
    <main className="flex w-full flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
          SiniKos
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
          Kelola kos lebih rapi, tagihan sampai ke WhatsApp.
        </h1>
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">
          Platform multi-tenant untuk pemilik kos: kamar, penyewa, kontrak, dan
          tagihan otomatis via Fonnte.
        </p>
        <div className="mt-8 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/register">Mulai gratis</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
            <Link href="/login">Masuk</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
