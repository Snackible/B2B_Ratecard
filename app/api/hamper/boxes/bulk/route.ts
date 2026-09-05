import { NextResponse } from "next/server";
import { addBoxes } from "@/lib/storage";
import { parseNewBoxInput } from "@/lib/validateBox";
import type { NewBoxInput } from "@/lib/types";

// Adds many boxes in a single read-modify-write — use this instead of
// looping POST /api/hamper/boxes, which races itself under back-to-back calls.
export async function POST(req: Request) {
  const body = (await req.json()) as Partial<NewBoxInput>[];

  if (!Array.isArray(body) || body.length === 0) {
    return NextResponse.json({ error: "Expected a non-empty array of boxes" }, { status: 400 });
  }

  const parsed: NewBoxInput[] = [];
  for (const [i, entry] of body.entries()) {
    const result = parseNewBoxInput(entry);
    if (typeof result === "string") {
      return NextResponse.json({ error: `Box ${i}: ${result}` }, { status: 400 });
    }
    parsed.push(result);
  }

  const boxes = await addBoxes(parsed);
  return NextResponse.json(boxes, { status: 201 });
}
