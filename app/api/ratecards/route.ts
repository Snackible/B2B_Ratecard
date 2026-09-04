import { NextResponse } from "next/server";
import { listRateCards, saveRateCard } from "@/lib/storage";
import type { HamperBoxInstance, OrderType, RateCardLineItem } from "@/lib/types";

export async function GET() {
  const cards = await listRateCards();
  return NextResponse.json(cards);
}

type SaveBody = {
  orderType: OrderType;
  clientName: string | null;
  showClientName: boolean;
  discountPercent: number;
  transportCostEnabled: boolean;
  transportCostAmount: number;
  boxCostTotal: number;
  lineItems: RateCardLineItem[];
  boxInstances?: HamperBoxInstance[];
  imageDataUrl: string;
};

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<SaveBody>;

  const hasLineItems = Array.isArray(body.lineItems) && body.lineItems.length > 0;
  const hasBoxes = Array.isArray(body.boxInstances) && body.boxInstances.length > 0;
  if (!hasLineItems && !hasBoxes) {
    return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
  }
  if (typeof body.imageDataUrl !== "string" || !body.imageDataUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "Missing rendered image" }, { status: 400 });
  }
  if (typeof body.discountPercent !== "number") {
    return NextResponse.json({ error: "Missing discount" }, { status: 400 });
  }
  if (body.orderType !== "bulk" && body.orderType !== "hamper") {
    return NextResponse.json({ error: "Invalid order type" }, { status: 400 });
  }

  const meta = await saveRateCard(
    {
      orderType: body.orderType,
      clientName: body.clientName ?? null,
      showClientName: Boolean(body.showClientName),
      discountPercent: body.discountPercent,
      transportCostEnabled: Boolean(body.transportCostEnabled),
      transportCostAmount: typeof body.transportCostAmount === "number" ? body.transportCostAmount : 0,
      boxCostTotal: typeof body.boxCostTotal === "number" ? body.boxCostTotal : 0,
      lineItems: body.lineItems ?? [],
      boxInstances: body.boxInstances,
    },
    body.imageDataUrl
  );

  return NextResponse.json(meta, { status: 201 });
}
