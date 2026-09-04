import { NextResponse } from "next/server";
import { addBoxType, getHamperConfig, removeBoxType } from "@/lib/storage";
import type { NewBoxTypeInput } from "@/lib/types";

export async function GET() {
  const config = await getHamperConfig();
  return NextResponse.json(config);
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<NewBoxTypeInput>;

  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "Box type name is required" }, { status: 400 });
  }

  const boxType = await addBoxType({ name: body.name.trim() });
  return NextResponse.json(boxType, { status: 201 });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await removeBoxType(id);
  return NextResponse.json({ ok: true });
}
