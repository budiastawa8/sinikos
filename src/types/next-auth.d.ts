import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      organizationId: string | null;
    };
  }

  interface User {
    organizationId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    organizationId?: string | null;
  }
}
