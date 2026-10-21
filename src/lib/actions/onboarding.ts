"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({
  orgName: z.string().min(2, "Nama bisnis minimal 2 karakter"),
  propertyName: z.string().min(2, "Nama kos minimal 2 karakter"),
  address: z.string().optional(),
});

export type OnboardState = { error?: string };

export async function onboardAction(
  _prev: OnboardState,
  formData: FormData,
): Promise<OnboardState> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const existing = await db.membership.findFirst({
    where: { userId: session.user.id },
  });
  if (existing) {
    redirect("/dashboard");
  }

  const parsed = schema.safeParse({
    orgName: formData.get("orgName"),
    propertyName: formData.get("propertyName"),
    address: formData.get("address") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  await db.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: { name: parsed.data.orgName },
    });
    await tx.membership.create({
      data: {
        userId: session.user.id,
        organizationId: org.id,
        role: "OWNER",
      },
    });
    await tx.property.create({
      data: {
        organizationId: org.id,
        name: parsed.data.propertyName,
        address: parsed.data.address,
      },
    });
  });

  redirect("/dashboard");
}
