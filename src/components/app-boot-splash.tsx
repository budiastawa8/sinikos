"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const MIN_MS = 1000;
const MAX_MS = 4500;
const SESSION_KEY = "sinikos-boot-done";

/**
 * Setelah splash OS: overlay logo (lebih kecil) + animasi tunggu
 * sampai halaman app siap. Sekali per sesi tab.
 */
export function AppBootSplash() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch {
      /* ignore */
    }

    setVisible(true);
    const started = Date.now();
    let finished = false;

    function finish() {
      if (finished) return;
      finished = true;
      const wait = Math.max(0, MIN_MS - (Date.now() - started));
      window.setTimeout(() => {
        setLeaving(true);
        window.setTimeout(() => {
          setVisible(false);
          try {
            sessionStorage.setItem(SESSION_KEY, "1");
          } catch {
            /* ignore */
          }
        }, 350);
      }, wait);
    }

    if (document.readyState === "complete") {
      // Beri browser satu frame untuk paint shell, lalu selesai setelah min time.
      requestAnimationFrame(() => finish());
    } else {
      window.addEventListener("load", finish, { once: true });
    }

    const maxTimer = window.setTimeout(finish, MAX_MS);
    return () => {
      window.removeEventListener("load", finish);
      window.clearTimeout(maxTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#0d5c56] transition-opacity duration-300",
        leaving ? "pointer-events-none opacity-0" : "opacity-100",
      )}
      role="status"
      aria-live="polite"
      aria-label="Memuat SiniKos"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/icon-512.png"
        alt=""
        width={96}
        height={96}
        className="size-24 rounded-2xl shadow-md sm:size-28"
        decoding="async"
      />
      <div className="mt-8 h-1 w-36 overflow-hidden rounded-full bg-white/20">
        <div className="sinikos-boot-bar h-full w-1/2 rounded-full bg-white/90" />
      </div>
      <p className="mt-3 text-sm font-medium tracking-wide text-white/85">
        Memuat…
      </p>
    </div>
  );
}
