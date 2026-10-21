import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const user = await db.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
          include: {
            memberships: {
              take: 1,
              orderBy: { createdAt: "asc" },
            },
          },
        });

        if (!user) return null;

        const valid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash,
        );
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          organizationId: user.memberships[0]?.organizationId ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = user.id;
        token.organizationId =
          (user as { organizationId?: string | null }).organizationId ?? null;
      }

      if (trigger === "update" && session?.organizationId) {
        token.organizationId = session.organizationId as string;
      }

      // Refresh org if missing
      if (token.sub && !token.organizationId) {
        const membership = await db.membership.findFirst({
          where: { userId: token.sub },
          orderBy: { createdAt: "asc" },
        });
        token.organizationId = membership?.organizationId ?? null;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.organizationId =
          (token.organizationId as string | null) ?? null;
      }
      return session;
    },
  },
});
