import { NextResponse } from "next/server";
import { getSettings, saveSettings } from "@/lib/storage";
import type { AppSettings } from "@/lib/types";

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json(settings);
}

export async function PUT(req: Request) {
  const body = (await req.json()) as Partial<AppSettings>;

  if (body.transportCost !== undefined && (typeof body.transportCost !== "number" || body.transportCost < 0)) {
    return NextResponse.json({ error: "Transport cost must be a non-negative number" }, { status: 400 });
  }
  if (body.diyaPackCost !== undefined && (typeof body.diyaPackCost !== "number" || body.diyaPackCost < 0)) {
    return NextResponse.json({ error: "Diya pack cost must be a non-negative number" }, { status: 400 });
  }

  const current = await getSettings();
  const next: AppSettings = {
    transportCost: body.transportCost ?? current.transportCost,
    diyaPackCost: body.diyaPackCost ?? current.diyaPackCost,
  };
  await saveSettings(next);
  return NextResponse.json(next);
}
