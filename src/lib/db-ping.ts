import { db } from "@/lib/db";

/** Satu round-trip ringan untuk warm-up Neon / health check. */
export async function pingDatabase() {
  const started = Date.now();
  await db.$queryRaw`SELECT 1`;
  return { ok: true as const, latencyMs: Date.now() - started };
}
