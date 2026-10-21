import { AppShell } from "@/components/app-shell";
import { requireOrg } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { organization } = await requireOrg();

  return <AppShell orgName={organization.name}>{children}</AppShell>;
}
