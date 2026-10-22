"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { startSubscriptionCheckoutAction } from "@/lib/actions/billing";

export function SubscribeButton({
  period,
  plan = "PRO",
  label,
  disabled,
  variant = "default",
}: {
  period: "MONTHLY" | "YEARLY";
  plan?: "PRO" | "PRO_PLUS";
  label: string;
  disabled?: boolean;
  variant?: "default" | "outline" | "secondary";
}) {
  const [pending, start] = useTransition();

  return (
    <Button
      type="button"
      variant={variant}
      className="h-11 w-full"
      disabled={disabled || pending}
      onClick={() =>
        start(async () => {
          const result = await startSubscriptionCheckoutAction(period, plan);
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
