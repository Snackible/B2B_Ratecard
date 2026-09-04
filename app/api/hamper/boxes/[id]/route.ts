import { NextResponse } from "next/server";
import { removeBox, updateBox } from "@/lib/storage";
import type { NewBoxInput } from "@/lib/types";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json()) as Partial<NewBoxInput>;

  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "Box name is required" }, { status: 400 });
  }
  if (!body.boxTypeId || typeof body.boxTypeId !== "string") {
    return NextResponse.json({ error: "Box type is required" }, { status: 400 });
  }
  if (typeof body.cost !== "number" || body.cost < 0) {
    return NextResponse.json({ error: "Box cost must be a non-negative number" }, { status: 400 });
  }

  const box = await updateBox(id, {
    name: body.name.trim(),
    boxTypeId: body.boxTypeId,
    cost: body.cost,
    itemIds: Array.isArray(body.itemIds) ? body.itemIds : [],
  });

  if (!box) return NextResponse.json({ error: "Box not found" }, { status: 404 });
  return NextResponse.json(box);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await removeBox(id);
  return NextResponse.json({ ok: true });
}
