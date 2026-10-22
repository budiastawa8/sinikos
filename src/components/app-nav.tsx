"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CreditCard,
  DoorOpen,
  FileText,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/actions/auth";

export const APP_NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/properties", label: "Properti", icon: Building2 },
  { href: "/tenants", label: "Penyewa", icon: Users },
  { href: "/leases", label: "Kontrak", icon: DoorOpen },
  { href: "/invoices", label: "Tagihan", icon: FileText },
  { href: "/billing", label: "Langganan", icon: CreditCard },
  { href: "/settings", label: "Pengaturan", icon: Settings },
] as const;

type AppNavProps = {
  orgName: string;
  planLabel: string;
  onNavigate?: () => void;
  className?: string;
};

export function AppNav({
  orgName,
  planLabel,
  onNavigate,
  className,
}: AppNavProps) {
  const pathname = usePathname();

  return (
    <div className={cn("flex h-full flex-col px-4 py-6", className)}>
      <div className="mb-8 px-2">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
          SiniKos
        </p>
        <p className="mt-1 truncate text-sm font-semibold">{orgName}</p>
        <Link
          href="/billing"
          onClick={onNavigate}
          className="mt-2 inline-flex h-10 items-center rounded-md bg-primary/10 px-3 text-sm font-medium text-primary"
        >
          Paket {planLabel}
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {APP_NAV_LINKS.map((link) => {
          const Icon = link.icon;
          const active =
            pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <form action={logoutAction}>
        <Button
          type="submit"
          variant="ghost"
          className="h-11 w-full justify-start gap-3"
        >
          <LogOut className="size-4" />
          Keluar
        </Button>
      </form>
    </div>
  );
}
