import { NextResponse } from "next/server";
import { listRateCardSnapshots } from "@/lib/storage";
import { computeUsageStats } from "@/lib/usageStats";

export const dynamic = "force-dynamic";

export async function GET() {
  const cards = await listRateCardSnapshots();
  return NextResponse.json(computeUsageStats(cards));
}
