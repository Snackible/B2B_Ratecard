import { NextResponse } from "next/server";
import { getSettings, saveSettings } from "@/lib/storage";
import type { AppSettings } from "@/lib/types";

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json(settings);
}

export async function PUT(req: Request) {
  const body = (await req.json()) as Partial<AppSettings>;

  if (typeof body.transportCost !== "number" || body.transportCost < 0) {
    return NextResponse.json({ error: "Transport cost must be a non-negative number" }, { status: 400 });
  }

  await saveSettings({ transportCost: body.transportCost });
  return NextResponse.json({ transportCost: body.transportCost });
}
