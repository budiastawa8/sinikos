export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true">
      <div className="h-8 w-48 rounded-md bg-muted" />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="h-24 rounded-xl border bg-muted/60" />
        <div className="h-24 rounded-xl border bg-muted/60" />
        <div className="h-24 rounded-xl border bg-muted/60" />
        <div className="h-24 rounded-xl border bg-muted/60" />
      </div>
      <div className="h-64 rounded-xl border bg-muted/40" />
      <span className="sr-only">Memuat admin…</span>
    </div>
  );
}
