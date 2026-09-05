import { NextResponse } from "next/server";
import { removeBox, updateBox } from "@/lib/storage";
import { parseNewBoxInput } from "@/lib/validateBox";
import type { NewBoxInput } from "@/lib/types";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json()) as Partial<NewBoxInput>;

  const parsed = parseNewBoxInput(body);
  if (typeof parsed === "string") {
    return NextResponse.json({ error: parsed }, { status: 400 });
  }

  const box = await updateBox(id, parsed);
  if (!box) return NextResponse.json({ error: "Box not found" }, { status: 404 });
  return NextResponse.json(box);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await removeBox(id);
  return NextResponse.json({ ok: true });
}
