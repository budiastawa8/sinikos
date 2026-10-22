import Link from "next/link";
import { Button } from "@/components/ui/button";

export function PlanLimitNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>
      <Button asChild className="h-11 w-full">
        <Link href="/billing">Upgrade ke Pro</Link>
      </Button>
    </div>
  );
}
