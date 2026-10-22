"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { startSubscriptionCheckoutAction } from "@/lib/actions/billing";

export function SubscribeButton({
  period,
  label,
  disabled,
}: {
  period: "MONTHLY" | "YEARLY";
  label: string;
  disabled?: boolean;
}) {
  const [pending, start] = useTransition();

  return (
    <Button
      type="button"
      className="h-11 w-full"
      disabled={disabled || pending}
      onClick={() =>
        start(async () => {
          const result = await startSubscriptionCheckoutAction(period);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          window.location.href = result.url;
        })
      }
    >
      {pending ? "Menyiapkan pembayaran..." : label}
    </Button>
  );
}
