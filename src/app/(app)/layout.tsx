import { AppBootSplash } from "@/components/app-boot-splash";
import { AppShell } from "@/components/app-shell";
import { activePlanCode, planLabel } from "@/lib/billing/plans";
import { requireOrg } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { organization } = await requireOrg();
  const label = planLabel(activePlanCode(organization));

  return (
    <>
      <AppBootSplash />
      <AppShell orgName={organization.name} planLabel={label}>
        {children}
      </AppShell>
    </>
  );
}
