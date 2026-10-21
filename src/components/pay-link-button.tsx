"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createPaymentLinkAction } from "@/lib/actions/invoices";

export function PayLinkButton({
  invoiceId,
  existingUrl,
}: {
  invoiceId: string;
  existingUrl?: string | null;
}) {
  const [pending, start] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      className="w-full sm:w-auto"
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            const fd = new FormData();
            fd.set("invoiceId", invoiceId);
            const result = await createPaymentLinkAction(fd);
            const url = result.url || existingUrl;
            if (!url) throw new Error("Link tidak tersedia");
            await navigator.clipboard.writeText(url).catch(() => undefined);
            toast.success("Link bayar siap — dibuka di tab baru");
            window.open(url, "_blank", "noopener,noreferrer");
          } catch (e) {
            toast.error(
              e instanceof Error ? e.message : "Gagal membuat link bayar",
            );
          }
        })
      }
    >
      {pending
        ? "Memproses..."
        : existingUrl
          ? "Link bayar Midtrans"
          : "Buat link bayar"}
    </Button>
  );
}
