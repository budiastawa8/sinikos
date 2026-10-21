"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { syncMidtransStatusAction } from "@/lib/actions/invoices";

export function SyncMidtransButton({ invoiceId }: { invoiceId: string }) {
  const [pending, start] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="w-full sm:w-auto"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const fd = new FormData();
          fd.set("invoiceId", invoiceId);
          const result = await syncMidtransStatusAction(fd);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success(result.message);
        })
      }
    >
      {pending ? "Mengecek..." : "Cek status bayar"}
    </Button>
  );
}
