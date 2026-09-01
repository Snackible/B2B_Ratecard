import { NextResponse } from "next/server";
import { removeItem } from "@/lib/storage";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await removeItem(id);
  return NextResponse.json({ ok: true });
}
