import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";
import { loginAction } from "@/lib/actions/auth";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect(session.user.organizationId ? "/dashboard" : "/onboarding");
  }

  return (
    <main className="flex w-full flex-1 items-center justify-center px-4 py-8 sm:py-12">
      <AuthForm mode="login" action={loginAction} />
    </main>
  );
}
