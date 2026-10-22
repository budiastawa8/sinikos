"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "sinikos-pwa-install-dismissed";

/**
 * Banner install PWA (Chrome/Android). iOS tidak punya beforeinstallprompt —
 * petunjuk singkat ditampilkan jika standalone belum aktif.
 */
export function PwaInstallHint() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [iosHint, setIosHint] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);

    if (isIos) {
      setIosHint(true);
      setHidden(false);
      return;
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setHidden(false);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (hidden) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setHidden(true);
    setDeferred(null);
    setIosHint(false);
  };

  return (
    <div className="rounded-lg border border-primary/20 bg-accent/60 px-4 py-3 text-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-medium text-foreground">Pasang SiniKos di HP</p>
          <p className="mt-0.5 text-muted-foreground">
            {iosHint
              ? "Di Safari: ketuk Bagikan, lalu “Tambah ke Layar Utama”."
              : "Akses lebih cepat seperti aplikasi, tanpa Play Store."}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 flex-1 sm:flex-none"
            onClick={dismiss}
          >
            Nanti
          </Button>
          {deferred && (
            <Button
              type="button"
              className="h-10 flex-1 gap-2 sm:flex-none"
              onClick={async () => {
                await deferred.prompt();
                await deferred.userChoice;
                dismiss();
              }}
            >
              <Download className="size-4" />
              Pasang
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
