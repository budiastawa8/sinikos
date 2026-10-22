"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resendWhatsAppAction } from "@/lib/actions/invoices";

export function SendWhatsAppButton({
  invoiceId,
  disabled,
}: {
  invoiceId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="h-10 w-full sm:w-auto"
      disabled={disabled || pending}
      onClick={() =>
        start(async () => {
          const fd = new FormData();
          fd.set("invoiceId", invoiceId);
          const result = await resendWhatsAppAction(fd);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success(result.message);
          router.refresh();
        })
      }
    >
      {pending ? "Mengirim..." : "Kirim WA"}
    </Button>
  );
}
