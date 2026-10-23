"use client";

import { deleteTenantAction } from "@/lib/actions/properties";
import { useServerAction } from "@/hooks/use-server-action";
import { PendingSubmitButton } from "@/components/pending-submit-button";

export function TenantDeleteButton({
  id,
  fullWidth,
}: {
  id: string;
  fullWidth?: boolean;
}) {
  const { pending, onSubmit } = useServerAction(deleteTenantAction, {
    success: "Penyewa dihapus",
    error: "Gagal menghapus penyewa",
  });

  return (
    <form onSubmit={onSubmit} className={fullWidth ? "w-full" : undefined}>
      <input type="hidden" name="id" value={id} />
      <PendingSubmitButton
        pending={pending}
        pendingLabel="Menghapus…"
        size="sm"
        variant={fullWidth ? "outline" : "ghost"}
        className={fullWidth ? "h-10 w-full" : undefined}
      >
        Hapus
      </PendingSubmitButton>
    </form>
  );
}
