"use client";

import Link from "next/link";
import {
  cancelPendingLeaseAction,
  checkOutAction,
} from "@/lib/actions/leases";
import { useServerAction } from "@/hooks/use-server-action";
import { Button } from "@/components/ui/button";
import { PendingSubmitButton } from "@/components/pending-submit-button";

export function LeaseCancelButton({
  leaseId,
  fullWidth,
}: {
  leaseId: string;
  fullWidth?: boolean;
}) {
  const { pending, onSubmit } = useServerAction(cancelPendingLeaseAction, {
    success: "Check-in dibatalkan",
    error: "Gagal membatalkan check-in",
  });

  return (
    <form
      onSubmit={onSubmit}
      className={fullWidth ? "min-w-0 flex-1" : undefined}
    >
      <input type="hidden" name="leaseId" value={leaseId} />
      <PendingSubmitButton
        pending={pending}
        pendingLabel="Membatalkan…"
        size="sm"
        variant="outline"
        className={fullWidth ? "h-10 w-full" : undefined}
      >
        Batalkan
      </PendingSubmitButton>
    </form>
  );
}

export function LeaseCheckOutButton({
  leaseId,
  fullWidth,
}: {
  leaseId: string;
  fullWidth?: boolean;
}) {
  const { pending, onSubmit } = useServerAction(checkOutAction, {
    success: "Check-out berhasil",
    error: "Gagal check-out",
  });

  return (
    <form
      onSubmit={onSubmit}
      className={fullWidth ? "min-w-0 flex-1" : undefined}
    >
      <input type="hidden" name="leaseId" value={leaseId} />
      <PendingSubmitButton
        pending={pending}
        pendingLabel="Memproses…"
        size="sm"
        variant="outline"
        className={fullWidth ? "h-10 w-full" : undefined}
      >
        Check-out
      </PendingSubmitButton>
    </form>
  );
}

export function LeasePendingActions({
  leaseId,
  fullWidth,
}: {
  leaseId: string;
  fullWidth?: boolean;
}) {
  if (fullWidth) {
    return (
      <>
        <Button asChild size="sm" className="h-10 min-w-0 flex-1">
          <Link href="/invoices">Lunasin</Link>
        </Button>
        <LeaseCancelButton leaseId={leaseId} fullWidth />
      </>
    );
  }

  return (
    <>
      <Button asChild size="sm" variant="default">
        <Link href="/invoices">Lunasin</Link>
      </Button>
      <LeaseCancelButton leaseId={leaseId} />
    </>
  );
}
