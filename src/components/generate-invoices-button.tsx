"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function GenerateInvoicesButton({
  action,
}: {
  action: () => Promise<{ created: number }>;
}) {
  const [pending, start] = useTransition();

  return (
    <Button
      className="w-full sm:w-auto"
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            const result = await action();
            toast.success(
              result.created > 0
                ? `${result.created} tagihan baru dibuat`
                : "Tidak ada tagihan baru (sudah digenerate)",
            );
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Gagal generate");
          }
        })
      }
    >
      {pending ? "Memproses..." : "Generate tagihan bulan ini"}
    </Button>
  );
}
