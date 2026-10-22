"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { syncSubscriptionAction } from "@/lib/actions/billing";

export function SyncSubscriptionButton({
  subscriptionId,
}: {
  subscriptionId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="h-10 w-full sm:w-auto"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await syncSubscriptionAction(subscriptionId);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success(result.message);
          router.refresh();
        })
      }
    >
      {pending ? "Mengecek..." : "Cek status bayar"}
    </Button>
  );
}
