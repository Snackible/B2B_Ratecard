import { NextResponse } from "next/server";
import { updateHamperConfig } from "@/lib/storage";
import type { HamperConfig } from "@/lib/types";

// Merges whichever sections are provided into the current hamper config in a
// single write — used for bulk edits (many boxes/add-ons at once) so callers
// don't loop individual box/add-on endpoints, which race under back-to-back calls.
export async function PUT(req: Request) {
  const body = (await req.json()) as Partial<HamperConfig>;

  if (body.boxTypes !== undefined && !Array.isArray(body.boxTypes)) {
    return NextResponse.json({ error: "boxTypes must be an array" }, { status: 400 });
  }
  if (body.boxes !== undefined && !Array.isArray(body.boxes)) {
    return NextResponse.json({ error: "boxes must be an array" }, { status: 400 });
  }
  if (body.addOns !== undefined && !Array.isArray(body.addOns)) {
    return NextResponse.json({ error: "addOns must be an array" }, { status: 400 });
  }

  const config = await updateHamperConfig(body);
  return NextResponse.json(config);
}
