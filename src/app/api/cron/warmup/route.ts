import { NextRequest, NextResponse } from "next/server";
import { pingDatabase } from "@/lib/db-ping";

/**
 * Warm-up Neon agar compute jarang cold-start.
 * Panggil berkala (mis. UptimeRobot / cron eksternal tiap 4–5 menit) dengan
 * `Authorization: Bearer $CRON_SECRET`.
 * Vercel Hobby hanya mengizinkan cron harian — jangan andalkan vercel.json
 * untuk interval pendek.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await pingDatabase();
    return NextResponse.json(result);
  } catch (e) {
    console.error("[warmup]", e);
    return NextResponse.json(
      { ok: false, error: "Database unreachable" },
      { status: 503 },
    );
  }
}
