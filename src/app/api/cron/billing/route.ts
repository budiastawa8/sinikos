import { NextRequest, NextResponse } from "next/server";
import { runDailyBillingJob } from "@/lib/billing/generate";
import { pingDatabase } from "@/lib/db-ping";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Warm Neon sebelum pekerjaan berat (kurangi cold-start di job).
  await pingDatabase();
  const result = await runDailyBillingJob();
  return NextResponse.json({ ok: true, ...result });
}
