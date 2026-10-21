import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { OnboardingForm } from "@/components/onboarding-form";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await db.membership.findFirst({
    where: { userId: session.user.id },
  });
  if (membership) redirect("/dashboard");

  return (
    <main className="flex w-full flex-1 items-center justify-center px-4 py-8 sm:py-12">
      <OnboardingForm />
    </main>
  );
}
