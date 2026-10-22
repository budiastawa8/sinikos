"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import {
  createPaymentLinkAction,
  recordPaymentAction,
  resendWhatsAppAction,
  syncMidtransStatusAction,
} from "@/lib/actions/invoices";
import { formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type Props = {
  invoiceId: string;
  tenantName: string;
  periodLabel: string;
  amount: number;
  amountPaid: number;
  status: string;
  paymentUrl?: string | null;
  midtransOrderId?: string | null;
  pro: boolean;
  midtransReady: boolean;
  waDisabled?: boolean;
};

export function InvoiceRowActions({
  invoiceId,
  tenantName,
  periodLabel,
  amount,
  amountPaid,
  status,
  paymentUrl,
  midtransOrderId,
  pro,
  midtransReady,
  waDisabled,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"menu" | "pay">("menu");
  const [pending, start] = useTransition();
  const outstanding = Math.max(0, amount - amountPaid);
  const unpaid = status !== "PAID";

  if (!unpaid && !pro) {
    return <span className="text-sm text-muted-foreground">-</span>;
  }

  function closeAndReset() {
    setOpen(false);
    setView("menu");
  }

  function run(
    label: string,
    fn: () => Promise<
      | { ok: true; message?: string; url?: string }
      | { ok: false; error: string }
    >,
    onOk?: (result: {
      ok: true;
      message?: string;
      url?: string;
    }) => boolean | void,
  ) {
    start(async () => {
      try {
        const result = await fn();
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        if (onOk) {
          const keepOpen = onOk(result) === false;
          if (keepOpen) return;
        } else {
          toast.success(result.message ?? label);
        }
        router.refresh();
        closeAndReset();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Terjadi kesalahan");
      }
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setView("menu");
      }}
    >
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10 gap-1.5 px-3"
          aria-label={`Aksi tagihan ${tenantName}`}
        >
          <MoreHorizontal className="size-4" />
          Aksi
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="gap-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <SheetHeader className="pb-3">
          <SheetTitle>
            {view === "pay" ? "Catat bayar" : "Aksi tagihan"}
          </SheetTitle>
          <SheetDescription>
            {tenantName} · {periodLabel}
            {unpaid && outstanding > 0
              ? ` · sisa ${formatRupiah(outstanding)}`
              : ""}
          </SheetDescription>
        </SheetHeader>

        {view === "menu" ? (
          <div className="flex flex-col gap-1 px-3 pb-4">
            {unpaid && (
              <ActionRow
                disabled={pending}
                onClick={() => setView("pay")}
                label="Catat bayar manual"
                hint="Cash / transfer dicatat di SiniKos"
              />
            )}
            {unpaid && pro && midtransReady && (
              <ActionRow
                disabled={pending}
                onClick={() =>
                  run(
                    "Link bayar",
                    async () => {
                      const fd = new FormData();
                      fd.set("invoiceId", invoiceId);
                      return createPaymentLinkAction(fd);
                    },
                    (result) => {
                      const url = result.url || paymentUrl;
                      if (!url) {
                        toast.error("Link tidak tersedia");
                        return false;
                      }
                      void navigator.clipboard
                        .writeText(url)
                        .catch(() => undefined);
                      toast.success("Link bayar siap — dibuka di tab baru");
                      window.open(url, "_blank", "noopener,noreferrer");
                    },
                  )
                }
                label={paymentUrl ? "Buka link bayar Midtrans" : "Buat link bayar Midtrans"}
              />
            )}
            {unpaid && midtransReady && midtransOrderId && (
              <ActionRow
                disabled={pending}
                onClick={() =>
                  run("Cek status", async () => {
                    const fd = new FormData();
                    fd.set("invoiceId", invoiceId);
                    return syncMidtransStatusAction(fd);
                  })
                }
                label="Cek status bayar Midtrans"
              />
            )}
            {pro && (
              <ActionRow
                disabled={pending || waDisabled}
                onClick={() =>
                  run("Kirim WA", async () => {
                    const fd = new FormData();
                    fd.set("invoiceId", invoiceId);
                    return resendWhatsAppAction(fd);
                  })
                }
                label="Kirim WhatsApp"
                hint={waDisabled ? "Kuota WhatsApp bulan ini habis" : undefined}
              />
            )}
            {!unpaid && !pro && (
              <p className="px-3 py-4 text-sm text-muted-foreground">
                Tagihan sudah lunas.
              </p>
            )}
          </div>
        ) : (
          <form
            className="space-y-4 px-4 pb-4"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const fd = new FormData(form);
              run("Catat bayar", () => recordPaymentAction(fd));
            }}
          >
            <input type="hidden" name="invoiceId" value={invoiceId} />
            <input type="hidden" name="method" value="TRANSFER" />
            <div className="space-y-2">
              <Label htmlFor={`pay-${invoiceId}`}>Nominal (Rp)</Label>
              <Input
                id={`pay-${invoiceId}`}
                name="amount"
                type="number"
                min={1}
                required
                defaultValue={outstanding > 0 ? outstanding : undefined}
                className="h-11"
                disabled={pending}
              />
              <p className="text-xs text-muted-foreground">
                Total tagihan {formatRupiah(amount)}, sudah terbayar{" "}
                {formatRupiah(amountPaid)}.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full"
                disabled={pending}
                onClick={() => setView("menu")}
              >
                Kembali
              </Button>
              <Button type="submit" className="h-11 w-full" disabled={pending}>
                {pending ? "Menyimpan..." : "Simpan pembayaran"}
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ActionRow({
  label,
  hint,
  onClick,
  disabled,
}: {
  label: string;
  hint?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-12 w-full flex-col items-start justify-center rounded-lg px-3 py-3 text-left text-sm transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
    >
      <span className="font-medium">{label}</span>
      {hint && (
        <span className="mt-0.5 text-xs text-muted-foreground">{hint}</span>
      )}
    </button>
  );
}
