import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/** Deduped per request — layout + page boleh memanggil tanpa 2× round-trip auth/DB. */
export const requireSession = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session;
});

/** Deduped per request — hindari query membership/org ganda di layout dan page. */
export const requireOrg = cache(async () => {
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
});
