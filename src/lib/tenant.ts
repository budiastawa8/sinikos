import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session;
}

export async function requireOrg() {
  const session = await requireSession();

  let membership = session.user.organizationId
    ? await db.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: session.user.id,
            organizationId: session.user.organizationId,
          },
        },
        include: { organization: true },
      })
    : null;

  if (!membership) {
    membership = await db.membership.findFirst({
      where: { userId: session.user.id },
      include: { organization: true },
      orderBy: { createdAt: "asc" },
    });
  }

  if (!membership) {
    redirect("/onboarding");
  }

  return {
    session,
    organizationId: membership.organizationId,
    organization: membership.organization,
    role: membership.role,
  };
}
