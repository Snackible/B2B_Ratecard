import { NextResponse } from "next/server";
import { addBox } from "@/lib/storage";
import { parseNewBoxInput } from "@/lib/validateBox";
import type { NewBoxInput } from "@/lib/types";

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<NewBoxInput>;

  const parsed = parseNewBoxInput(body);
  if (typeof parsed === "string") {
    return NextResponse.json({ error: parsed }, { status: 400 });
  }

  const box = await addBox(parsed);
  return NextResponse.json(box, { status: 201 });
}
