import { NextResponse } from "next/server";
import { deleteRateCard, updateRateCard } from "@/lib/storage";
import type { RateCardLineItem } from "@/lib/types";

type UpdateBody = {
  clientName: string | null;
  showClientName: boolean;
  discountPercent: number;
  lineItems: RateCardLineItem[];
  imageDataUrl: string;
};

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json()) as Partial<UpdateBody>;

  if (!Array.isArray(body.lineItems) || body.lineItems.length === 0) {
    return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
  }
  if (typeof body.imageDataUrl !== "string" || !body.imageDataUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "Missing rendered image" }, { status: 400 });
  }
  if (typeof body.discountPercent !== "number") {
    return NextResponse.json({ error: "Missing discount" }, { status: 400 });
  }

  const meta = await updateRateCard(
    id,
    {
      clientName: body.clientName ?? null,
      showClientName: Boolean(body.showClientName),
      discountPercent: body.discountPercent,
      lineItems: body.lineItems,
    },
    body.imageDataUrl
  );

  if (!meta) return NextResponse.json({ error: "Rate card not found" }, { status: 404 });
  return NextResponse.json(meta);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteRateCard(id);
  return NextResponse.json({ ok: true });
}
