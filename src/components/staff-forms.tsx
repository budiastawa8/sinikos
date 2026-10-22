"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addStaffAction, removeStaffAction } from "@/lib/actions/staff";

export function AddStaffForm({ disabled }: { disabled?: boolean }) {
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const result = await addStaffAction(fd);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success("Staf ditambahkan. Mereka bisa login dengan email itu.");
          e.currentTarget.reset();
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="staff-name">Nama</Label>
        <Input
          id="staff-name"
          name="name"
          required
          minLength={2}
          className="h-11"
          disabled={disabled || pending}
          placeholder="Nama karyawan"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="staff-email">Email login</Label>
        <Input
          id="staff-email"
          name="email"
          type="email"
          required
          className="h-11"
          disabled={disabled || pending}
          placeholder="staf@contoh.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="staff-password">Password awal</Label>
        <Input
          id="staff-password"
          name="password"
          type="password"
          minLength={6}
          className="h-11"
          disabled={disabled || pending}
          placeholder="Minimal 6 karakter (wajib jika akun baru)"
        />
        <p className="text-xs text-muted-foreground">
          Jika email sudah terdaftar tanpa organisasi, password boleh kosong.
        </p>
      </div>
      <Button
        type="submit"
        className="h-11 w-full sm:w-auto"
        disabled={disabled || pending}
      >
        {pending ? "Menyimpan..." : "Tambah staf"}
      </Button>
    </form>
  );
}

export function RemoveStaffButton({ membershipId }: { membershipId: string }) {
  const [pending, start] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      className="h-10"
      disabled={pending}
      onClick={() =>
        start(async () => {
          if (!confirm("Hapus akses staf ini dari organisasi?")) return;
          const result = await removeStaffAction(membershipId);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success("Akses staf dihapus.");
        })
      }
    >
      {pending ? "..." : "Hapus"}
    </Button>
  );
}
