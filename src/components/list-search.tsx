"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function ListSearch({
  value,
  onChange,
  placeholder = "Cari…",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileOpen = expanded || value.length > 0;

  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  return (
    <div
      className={cn(
        "flex w-full min-w-0 items-center justify-end md:w-auto",
        className,
      )}
    >
      {/* Desktop: field selalu terlihat */}
      <div className="relative hidden w-52 md:block lg:w-64">
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

      {/* Mobile: ikon → expand input */}
      <div className="flex w-full min-w-0 items-center justify-end md:hidden">
        {mobileOpen ? (
          <div className="relative w-full">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              ref={inputRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="h-10 w-full pl-9 pr-11"
              aria-label={placeholder}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0.5 top-1/2 h-9 w-9 -translate-y-1/2"
              aria-label="Tutup pencarian"
              onClick={() => {
                onChange("");
                setExpanded(false);
              }}
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            aria-label="Cari"
            onClick={() => setExpanded(true)}
          >
            <Search className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
