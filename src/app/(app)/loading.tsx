export default function AppLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-pulse" aria-busy="true">
      <div className="space-y-2">
        <div className="h-8 w-40 rounded-md bg-muted" />
        <div className="h-4 w-64 max-w-full rounded-md bg-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-28 rounded-xl border bg-muted/60" />
        <div className="h-28 rounded-xl border bg-muted/60" />
      </div>
      <div className="h-48 rounded-xl border bg-muted/40" />
      <span className="sr-only">Memuat halaman…</span>
    </div>
  );
}
