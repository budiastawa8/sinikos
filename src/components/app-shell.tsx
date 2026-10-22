"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { AppBottomNav } from "@/components/app-bottom-nav";
import { AppNav } from "@/components/app-nav";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function AppShell({
  orgName,
  planLabel,
  children,
}: {
  orgName: string;
  planLabel: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r bg-card/80 backdrop-blur md:flex md:flex-col">
        <AppNav orgName={orgName} planLabel={planLabel} mode="full" />
      </aside>

      {/* Mobile top bar + drawer (menu sekunder) */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-card/95 px-3 backdrop-blur md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              aria-label="Menu lainnya"
            >
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Menu lainnya</SheetTitle>
            </SheetHeader>
            <AppNav
              orgName={orgName}
              planLabel={planLabel}
              mode="more"
              onNavigate={() => setOpen(false)}
            />
          </SheetContent>
        </Sheet>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            SiniKos
          </p>
          <p className="truncate text-sm font-semibold">{orgName}</p>
        </div>
        <Link
          href="/billing"
          className="inline-flex h-10 shrink-0 items-center rounded-md px-3 text-sm font-medium text-primary"
        >
          {planLabel}
        </Link>
      </header>

      <main className="min-w-0 flex-1 overflow-auto px-4 py-5 pb-24 sm:px-6 md:p-8 md:pb-8">
        {children}
      </main>

      <AppBottomNav />
    </div>
  );
}
