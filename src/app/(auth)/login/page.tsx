import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";
import { loginAction } from "@/lib/actions/auth";
import { isProPlusActive } from "@/lib/billing/plans";
import { db } from "@/lib/db";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const session = await auth();

  if (session?.user?.id) {
    const membership = await db.membership.findFirst({
      where: { userId: session.user.id },
      include: { organization: true },
      orderBy: { createdAt: "asc" },
    });

    if (
      membership?.role === "STAFF" &&
      !isProPlusActive(membership.organization)
    ) {
      await signOut({ redirectTo: "/login?error=staf" });
    }

    redirect(session.user.organizationId ? "/dashboard" : "/onboarding");
  }

  const notice =
    error === "staf"
      ? "Akses staf memerlukan paket Pro+ aktif. Hubungi owner untuk memperpanjang langganan, atau masuk dengan akun owner."
      : null;

  return (
    <main className="flex w-full flex-1 items-center justify-center px-4 py-8 sm:py-12">
      <AuthForm mode="login" action={loginAction} notice={notice} />
    </main>
  );
}
