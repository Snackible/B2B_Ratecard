import { NextResponse } from "next/server";
import { addAddOn, removeAddOn } from "@/lib/storage";
import type { NewAddOnInput } from "@/lib/types";

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<NewAddOnInput>;

  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "Add-on name is required" }, { status: 400 });
  }
  const costPerUnit = Number(body.costPerUnit);
  if (!Number.isFinite(costPerUnit) || costPerUnit < 0) {
    return NextResponse.json({ error: "Cost per unit must be a non-negative number" }, { status: 400 });
  }

  const addOn = await addAddOn({ name: body.name.trim(), costPerUnit });
  return NextResponse.json(addOn, { status: 201 });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await removeAddOn(id);
  return NextResponse.json({ ok: true });
}
