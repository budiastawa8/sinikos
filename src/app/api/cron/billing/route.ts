import { NextRequest, NextResponse } from "next/server";
import { runDailyBillingJob } from "@/lib/billing/generate";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runDailyBillingJob();
  return NextResponse.json({ ok: true, ...result });
}
