import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requirePlatformAdmin();

  return (
    <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-4 py-5 sm:px-6 md:py-8">
      <header className="mb-6 flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            SiniKos Admin
          </p>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Panel platform
          </h1>
          <p className="truncate text-sm text-muted-foreground">
            {session.user?.email}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="h-10">
            <Link href="/dashboard">Ke app pemilik</Link>
          </Button>
        </div>
      </header>
      {children}
    </div>
  );
}
