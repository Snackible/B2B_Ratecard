import { NextResponse } from "next/server";
import { listRateCards, saveRateCard } from "@/lib/storage";
import type { RateCardLineItem } from "@/lib/types";

export async function GET() {
  const cards = await listRateCards();
  return NextResponse.json(cards);
}

type SaveBody = {
  clientName: string | null;
  showClientName: boolean;
  discountPercent: number;
  lineItems: RateCardLineItem[];
  imageDataUrl: string;
};

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<SaveBody>;

  if (!Array.isArray(body.lineItems) || body.lineItems.length === 0) {
    return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
  }
  if (typeof body.imageDataUrl !== "string" || !body.imageDataUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "Missing rendered image" }, { status: 400 });
  }
  if (typeof body.discountPercent !== "number") {
    return NextResponse.json({ error: "Missing discount" }, { status: 400 });
  }

  const meta = await saveRateCard(
    {
      clientName: body.clientName ?? null,
      showClientName: Boolean(body.showClientName),
      discountPercent: body.discountPercent,
      lineItems: body.lineItems,
    },
    body.imageDataUrl
  );

  return NextResponse.json(meta, { status: 201 });
}
