export default function StaffLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-pulse px-0">
      <div className="h-8 w-40 rounded-md bg-muted" />
      <div className="h-4 w-72 max-w-full rounded-md bg-muted" />
      <div className="h-48 rounded-xl border bg-card" />
      <div className="h-64 rounded-xl border bg-card" />
    </div>
  );
}
