"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { onboardAction, type OnboardState } from "@/lib/actions/onboarding";

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(
    onboardAction,
    {} as OnboardState,
  );

  return (
    <Card className="w-full max-w-lg shadow-md">
      <CardHeader>
        <CardTitle className="text-xl sm:text-2xl">Setup bisnis kos Anda</CardTitle>
        <CardDescription>
          Langkah singkat untuk membuat organisasi dan properti pertama.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orgName">Nama bisnis / organisasi</Label>
            <Input
              id="orgName"
              name="orgName"
              required
              placeholder="Contoh: Budias Property"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="propertyName">Nama kos pertama</Label>
            <Input
              id="propertyName"
              name="propertyName"
              required
              placeholder="Contoh: Kos Melati Putih"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Alamat (opsional)</Label>
            <Input id="address" name="address" placeholder="Alamat lengkap" />
          </div>
          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Menyimpan..." : "Lanjut ke dashboard"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
