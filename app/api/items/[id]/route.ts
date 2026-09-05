import { NextResponse } from "next/server";
import { removeItem, updateItem } from "@/lib/storage";
import type { Item } from "@/lib/types";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json()) as Partial<Item>;

  const patch: Partial<Omit<Item, "id">> = {};
  if (typeof body.name === "string") patch.name = body.name.trim();
  if (typeof body.category === "string") patch.category = body.category.trim();
  if (body.section === null || typeof body.section === "string") patch.section = body.section?.trim() || null;
  if (
    body.segment === "Standard Grammage" ||
    body.segment === "One Serving Pack" ||
    body.segment === "Large Grammage"
  ) {
    patch.segment = body.segment;
  }
  if (body.grammage === null || typeof body.grammage === "number") patch.grammage = body.grammage;
  if (typeof body.mrp === "number") patch.mrp = body.mrp;
  if (body.largerPackGrammage === null || typeof body.largerPackGrammage === "number")
    patch.largerPackGrammage = body.largerPackGrammage;
  if (body.largerPackMrp === null || typeof body.largerPackMrp === "number") patch.largerPackMrp = body.largerPackMrp;
  if (body.shelfLifeDays === null || typeof body.shelfLifeDays === "number") patch.shelfLifeDays = body.shelfLifeDays;

  const item = await updateItem(id, patch);
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await removeItem(id);
  return NextResponse.json({ ok: true });
}
