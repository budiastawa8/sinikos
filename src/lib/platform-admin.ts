import { cache } from "react";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/tenant";

/** Email super-admin platform, dipisah koma di env. */
export function platformAdminEmails(): string[] {
  const raw = process.env.PLATFORM_ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isPlatformAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  const allowed = platformAdminEmails();
  if (allowed.length === 0) return false;
  return allowed.includes(email.trim().toLowerCase());
}

/** Login wajib + email ada di PLATFORM_ADMIN_EMAILS. */
export const requirePlatformAdmin = cache(async () => {
  const session = await requireSession();
  const email = session.user?.email;
  if (!isPlatformAdminEmail(email)) {
    redirect("/dashboard");
  }
  return session;
});
