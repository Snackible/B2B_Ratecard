import { NextResponse } from "next/server";
import { addItems } from "@/lib/storage";
import { parseNewItemInput } from "@/lib/validateItem";
import type { NewItemInput } from "@/lib/types";

// Adds many items in a single read-modify-write — use this instead of looping
// POST /api/items, which races itself under back-to-back calls.
export async function POST(req: Request) {
  const body = (await req.json()) as Partial<NewItemInput>[];

  if (!Array.isArray(body) || body.length === 0) {
    return NextResponse.json({ error: "Expected a non-empty array of items" }, { status: 400 });
  }

  const parsed: NewItemInput[] = [];
  for (const [i, entry] of body.entries()) {
    const result = parseNewItemInput(entry);
    if (typeof result === "string") {
      return NextResponse.json({ error: `Item ${i}: ${result}` }, { status: 400 });
    }
    parsed.push(result);
  }

  const items = await addItems(parsed);
  return NextResponse.json(items, { status: 201 });
}
