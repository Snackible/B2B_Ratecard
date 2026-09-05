import { NextResponse } from "next/server";
import { addItem, getCatalog } from "@/lib/storage";
import { parseNewItemInput } from "@/lib/validateItem";
import type { NewItemInput } from "@/lib/types";

export async function GET() {
  const items = await getCatalog();
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<NewItemInput>;

  const parsed = parseNewItemInput(body);
  if (typeof parsed === "string") {
    return NextResponse.json({ error: parsed }, { status: 400 });
  }

  const item = await addItem(parsed);
  return NextResponse.json(item, { status: 201 });
}
