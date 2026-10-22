import { AppShell } from "@/components/app-shell";
import { isProActive } from "@/lib/billing/plans";
import { requireOrg } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { organization } = await requireOrg();
  const planLabel = isProActive(organization) ? "Pro" : "Gratis";

  return (
    <AppShell orgName={organization.name} planLabel={planLabel}>
      {children}
    </AppShell>
  );
}
