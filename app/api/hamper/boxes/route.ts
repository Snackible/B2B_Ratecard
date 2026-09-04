import { NextResponse } from "next/server";
import { addBox } from "@/lib/storage";
import type { NewBoxInput } from "@/lib/types";

export async function POST(req: Request) {
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

  const box = await addBox({
    name: body.name.trim(),
    boxTypeId: body.boxTypeId,
    cost: body.cost,
    itemIds: Array.isArray(body.itemIds) ? body.itemIds : [],
  });

  return NextResponse.json(box, { status: 201 });
}
