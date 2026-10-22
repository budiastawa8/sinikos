export default function ReportsLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-pulse">
      <div className="h-8 w-36 rounded-md bg-muted" />
      <div className="h-4 w-64 max-w-full rounded-md bg-muted" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border bg-card" />
        ))}
      </div>
      <div className="h-64 rounded-xl border bg-card" />
      <div className="h-64 rounded-xl border bg-card" />
    </div>
  );
}
