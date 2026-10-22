"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn, signOut } from "@/lib/auth";
import { isProPlusActive } from "@/lib/billing/plans";
import { db } from "@/lib/db";

const registerSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

export type ActionState = {
  error?: string;
  success?: string;
};

export async function registerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  const email = parsed.data.email.toLowerCase();
  const exists = await db.user.findUnique({ where: { email } });
  if (exists) {
    return { error: "Email sudah terdaftar" };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await db.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash,
    },
  });

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo: "/onboarding",
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return { error: "Akun dibuat, tetapi gagal login otomatis" };
    }
    throw e;
  }

  return { success: "Berhasil" };
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");

  if (email) {
    const user = await db.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: { organization: true },
          take: 1,
          orderBy: { createdAt: "asc" },
        },
      },
    });
    const membership = user?.memberships[0];
    if (
      membership?.role === "STAFF" &&
      !isProPlusActive(membership.organization)
    ) {
      return {
        error:
          "Akses staf memerlukan paket Pro+ aktif. Hubungi owner untuk memperpanjang langganan.",
      };
    }
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return { error: "Email atau password salah" };
    }
    throw e;
  }

  return { success: "Berhasil" };
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
