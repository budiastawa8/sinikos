"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Desktop: field cari di kanan judul.
 * Mobile: ikon sejajar judul; klik → baris field di bawahnya.
 */
export function ListSearch({
  value,
  onChange,
  placeholder = "Cari…",
  className,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Blok judul (CardTitle + CardDescription) di kiri. */
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  function closeMobileSearch() {
    onChange("");
    setExpanded(false);
  }

  return (
    <div className={cn("w-full space-y-3", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1.5">{children}</div>

        {/* Desktop: field selalu terlihat */}
        <div className="relative hidden w-52 shrink-0 md:block lg:w-64">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="h-10 pl-9"
            aria-label={placeholder}
          />
        </div>

        {/* Mobile: ikon sejajar judul */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0 md:hidden"
          aria-label={expanded ? "Tutup pencarian" : "Cari"}
          aria-expanded={expanded}
          onClick={() => {
            if (expanded) closeMobileSearch();
            else setExpanded(true);
          }}
        >
          {expanded ? <X className="size-4" /> : <Search className="size-4" />}
        </Button>
      </div>

      {/* Mobile: field muncul di baris baru setelah ikon diklik */}
      {expanded && (
        <div className="relative md:hidden">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="h-11 w-full pl-9 pr-3"
            aria-label={placeholder}
          />
        </div>
      )}
    </div>
  );
}
