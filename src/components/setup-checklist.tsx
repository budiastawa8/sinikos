"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Circle } from "lucide-react";
import type { SetupProgress } from "@/lib/setup-progress";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "sinikos-setup-checklist-dismissed";

export function SetupChecklist({ progress }: { progress: SetupProgress }) {
  const [dismissed, setDismissed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  if (!ready || progress.complete || dismissed) return null;

  const next = progress.next;

  return (
    <Card className="border-primary/25 bg-primary/[0.03]">
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle className="text-lg sm:text-xl">
            Langkah setup kos Anda
          </CardTitle>
          <CardDescription>
            Ikuti urutan ini sampai tagihan pertama siap.{" "}
            {progress.doneCount}/{progress.total} selesai
            {next ? ` · berikutnya: ${next.title}` : ""}.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="h-10 shrink-0 self-start text-muted-foreground"
          onClick={() => {
            try {
              localStorage.setItem(DISMISS_KEY, "1");
            } catch {
              /* ignore */
            }
            setDismissed(true);
          }}
        >
          Sembunyikan
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        <ol className="space-y-2">
          {progress.steps.map((step, index) => {
            const isNext = next?.id === step.id;
            return (
              <li key={step.id}>
                <div
                  className={cn(
                    "flex flex-col gap-3 rounded-lg border px-3 py-3 sm:flex-row sm:items-center sm:justify-between",
                    step.done && "border-transparent bg-muted/40",
                    isNext && "border-primary/40 bg-background shadow-sm",
                  )}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={cn(
                        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                        step.done
                          ? "bg-primary text-primary-foreground"
                          : isNext
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground",
                      )}
                      aria-hidden
                    >
                      {step.done ? (
                        <Check className="size-4" />
                      ) : (
                        <Circle className="size-3.5 fill-current" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        <span className="text-muted-foreground">
                          {index + 1}.{" "}
                        </span>
                        {step.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                        {step.description}
                      </p>
                    </div>
                  </div>
                  {!step.done && (
                    <Button
                      asChild
                      variant={isNext ? "default" : "outline"}
                      className="h-11 w-full shrink-0 sm:h-10 sm:w-auto"
                    >
                      <Link href={step.href}>{step.cta}</Link>
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        {next && (
          <p className="pt-1 text-xs text-muted-foreground">
            Midtrans dan reminder WhatsApp otomatis bisa diatur nanti — tidak
            wajib untuk mulai menagih.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
