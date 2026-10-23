"use client";

import { useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Messages = {
  success: string;
  error?: string;
};

/**
 * Submit server action dengan pending state + toast berhasil/gagal + refresh.
 */
export function useServerAction(
  action: (formData: FormData) => Promise<unknown>,
  messages: Messages,
) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function run(formData: FormData, onSuccess?: () => void) {
    start(async () => {
      try {
        await action(formData);
        toast.success(messages.success);
        onSuccess?.();
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : (messages.error ?? "Terjadi kesalahan"),
        );
      }
    });
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    run(new FormData(e.currentTarget));
  }

  return { pending, run, onSubmit };
}
