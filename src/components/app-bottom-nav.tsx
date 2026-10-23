"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MOBILE_TAB_LINKS,
  isMoreNavActive,
  navLinkActive,
} from "@/components/app-nav";

export function AppBottomNav({
  moreOpen,
  onOpenMore,
}: {
  moreOpen?: boolean;
  onOpenMore: () => void;
}) {
  const pathname = usePathname();
  const moreActive = isMoreNavActive(pathname);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      aria-label="Menu utama"
    >
      <ul className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {MOBILE_TAB_LINKS.map((link) => {
          const Icon = link.icon;
          const active = navLinkActive(pathname, link.href);
          return (
            <li key={link.href} className="min-w-0">
              <Link
                href={link.href}
                prefetch
                className={cn(
                  "flex h-full min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium sm:text-xs",
                  active
                    ? "text-primary"
                    : "text-muted-foreground active:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "size-5 shrink-0",
                    active && "stroke-[2.25px]",
                  )}
                  aria-hidden
                />
                <span className="truncate">{link.label}</span>
              </Link>
            </li>
          );
        })}
        <li className="min-w-0">
          <button
            type="button"
            onClick={onOpenMore}
            aria-label="Menu lainnya"
            aria-expanded={moreOpen ?? false}
            aria-haspopup="dialog"
            className={cn(
              "flex h-full min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium sm:text-xs",
              moreActive || moreOpen
                ? "text-primary"
                : "text-muted-foreground active:text-foreground",
            )}
          >
            <Menu
              className={cn(
                "size-5 shrink-0",
                (moreActive || moreOpen) && "stroke-[2.25px]",
              )}
              aria-hidden
            />
            <span className="truncate">Lainnya</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
