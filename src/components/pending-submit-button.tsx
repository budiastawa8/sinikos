"use client";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = ButtonProps & {
  pending: boolean;
  pendingLabel?: string;
};

/** Tombol submit yang menampilkan label proses saat pending. */
export function PendingSubmitButton({
  pending,
  pendingLabel = "Menyimpan…",
  children,
  className,
  disabled,
  ...props
}: Props) {
  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      className={cn(className)}
      {...props}
    >
      {pending ? pendingLabel : children}
    </Button>
  );
}
