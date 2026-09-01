import { NextResponse } from "next/server";
import { addItem, getCatalog } from "@/lib/storage";
import type { NewItemInput } from "@/lib/types";

export async function GET() {
  const items = await getCatalog();
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<NewItemInput>;

  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "Item name is required" }, { status: 400 });
  }
  if (!body.category || typeof body.category !== "string" || !body.category.trim()) {
    return NextResponse.json({ error: "Category is required" }, { status: 400 });
  }
  if (typeof body.mrp !== "number" || body.mrp <= 0) {
    return NextResponse.json({ error: "MRP must be a positive number" }, { status: 400 });
  }
  if (body.segment !== "Standard Grammage" && body.segment !== "One Serving Pack") {
    return NextResponse.json({ error: "Invalid segment" }, { status: 400 });
  }

  const item = await addItem({
    name: body.name.trim(),
    category: body.category.trim(),
    section: body.section?.trim() || null,
    segment: body.segment,
    grammage: typeof body.grammage === "number" ? body.grammage : null,
    mrp: body.mrp,
    largerPackGrammage: typeof body.largerPackGrammage === "number" ? body.largerPackGrammage : null,
    largerPackMrp: typeof body.largerPackMrp === "number" ? body.largerPackMrp : null,
    shelfLifeDays: typeof body.shelfLifeDays === "number" ? body.shelfLifeDays : null,
  });

  return NextResponse.json(item, { status: 201 });
}
