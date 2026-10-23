import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Banner singkat di halaman kosong agar pemilik awam tahu langkah berikutnya. */
export function SetupNextHint({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="rounded-lg border border-primary/25 bg-primary/[0.03] px-4 py-4">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      <Button asChild className="mt-3 h-11 w-full sm:w-auto">
        <Link href={href}>{cta}</Link>
      </Button>
    </div>
  );
}
