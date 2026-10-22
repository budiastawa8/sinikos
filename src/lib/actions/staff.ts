"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { loadEntitlements } from "@/lib/billing/entitlements";
import { requireOwner } from "@/lib/tenant";

const addSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter").optional(),
});

export async function addStaffAction(formData: FormData) {
  try {
    const { organizationId, organization } = await requireOwner();
    const entitlements = await loadEntitlements(organization);

    if (entitlements.limits.maxStaff < 1) {
      return {
        ok: false as const,
        error: "Multi-staf tersedia di paket Pro+. Upgrade dulu di Langganan.",
      };
    }
    if (entitlements.usage.staff >= entitlements.limits.maxStaff) {
      return {
        ok: false as const,
        error: `Batas ${entitlements.limits.maxStaff} staf tercapai. Hapus satu staf dulu.`,
      };
    }

    const parsed = addSchema.safeParse({
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim().toLowerCase(),
      password: String(formData.get("password") ?? "").trim() || undefined,
    });
    if (!parsed.success) {
      return {
        ok: false as const,
        error: parsed.error.issues[0]?.message ?? "Data tidak valid",
      };
    }

    const existing = await db.user.findUnique({
      where: { email: parsed.data.email },
      include: {
        memberships: { select: { organizationId: true } },
      },
    });

    if (existing) {
      if (
        existing.memberships.some((m) => m.organizationId === organizationId)
      ) {
        return { ok: false as const, error: "Email ini sudah menjadi anggota." };
      }
      if (existing.memberships.length > 0) {
        return {
          ok: false as const,
          error: "Email sudah terpakai di organisasi lain.",
        };
      }

      await db.membership.create({
        data: {
          userId: existing.id,
          organizationId,
          role: "STAFF",
        },
      });
    } else {
      if (!parsed.data.password) {
        return {
          ok: false as const,
          error: "Password awal wajib untuk akun staf baru.",
        };
      }
      const passwordHash = await bcrypt.hash(parsed.data.password, 10);
      await db.user.create({
        data: {
          name: parsed.data.name,
          email: parsed.data.email,
          passwordHash,
          memberships: {
            create: {
              organizationId,
              role: "STAFF",
            },
          },
        },
      });
    }

    return { ok: true as const };
  } catch (e) {
    // redirect() dari requireOwner — biarkan Next.js menangani navigasi
    if (
      typeof e === "object" &&
      e !== null &&
      "digest" in e &&
      typeof (e as { digest?: unknown }).digest === "string" &&
      String((e as { digest: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw e;
    }
    console.error("[staff] addStaffAction", e);
    return {
      ok: false as const,
      error:
        e instanceof Error
          ? e.message
          : "Gagal menambah staf. Coba lagi atau hubungi pengelola.",
    };
  }
}

export async function removeStaffAction(membershipId: string) {
  try {
    const { organizationId } = await requireOwner();

    const membership = await db.membership.findFirst({
      where: { id: membershipId, organizationId },
    });
    if (!membership) {
      return { ok: false as const, error: "Anggota tidak ditemukan" };
    }
    if (membership.role === "OWNER") {
      return {
        ok: false as const,
        error: "Owner tidak bisa dihapus dari sini.",
      };
    }

    await db.membership.delete({ where: { id: membership.id } });
    return { ok: true as const };
  } catch (e) {
    if (
      typeof e === "object" &&
      e !== null &&
      "digest" in e &&
      typeof (e as { digest?: unknown }).digest === "string" &&
      String((e as { digest: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw e;
    }
    console.error("[staff] removeStaffAction", e);
    return {
      ok: false as const,
      error:
        e instanceof Error ? e.message : "Gagal menghapus staf. Coba lagi.",
    };
  }
}
