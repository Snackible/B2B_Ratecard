import type { RateCardSnapshot } from "./types";

export type UsageStats = {
  totalCards: number;
  duplicatesIgnored: number;
  totalSales: number;
  byType: { bulk: { cards: number; sales: number }; hamper: { cards: number; sales: number } };
  topItems: { name: string; quantity: number }[];
};

// Two cards with the same client, order type, pricing settings and contents are the
// same quote saved more than once (e.g. "Load" then save again) — only the earliest counts.
function fingerprint(card: RateCardSnapshot): string {
  const lines = (items: RateCardSnapshot["lineItems"]) =>
    items
      .map((li) => `${li.itemId}:${li.packLabel}:${li.quantity}:${li.mrp}`)
      .sort()
      .join(",");
  const boxes = (card.boxInstances ?? [])
    .map(
      (b) =>
        `${b.boxId}x${b.quantity ?? 1}[${lines(b.lineItems ?? [])}][${(b.addOnSelections ?? [])
          .map((a) => `${a.addOnId}:${a.quantity}`)
          .sort()
          .join(",")}]`
    )
    .sort()
    .join("|");
  return [
    card.orderType,
    (card.clientName ?? "").trim().toLowerCase(),
    card.discountPercent,
    card.transportCostEnabled ? card.transportCostAmount : 0,
    lines(card.lineItems),
    boxes,
  ].join("#");
}

export function computeUsageStats(cards: RateCardSnapshot[]): UsageStats {
  const sorted = [...cards].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const seen = new Set<string>();
  const unique: RateCardSnapshot[] = [];
  for (const card of sorted) {
    const key = fingerprint(card);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(card);
  }

  const byType = { bulk: { cards: 0, sales: 0 }, hamper: { cards: 0, sales: 0 } };
  const itemQty = new Map<string, number>();
  let totalSales = 0;

  for (const card of unique) {
    const bucket = card.orderType === "hamper" ? byType.hamper : byType.bulk;
    bucket.cards++;
    bucket.sales += card.totalAmount;
    totalSales += card.totalAmount;

    for (const li of card.lineItems) {
      itemQty.set(li.name, (itemQty.get(li.name) ?? 0) + li.quantity);
    }
    for (const box of card.boxInstances ?? []) {
      for (const li of box.lineItems ?? []) {
        itemQty.set(li.name, (itemQty.get(li.name) ?? 0) + li.quantity * (box.quantity ?? 1));
      }
    }
  }

  const topItems = [...itemQty.entries()]
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity);

  return {
    totalCards: unique.length,
    duplicatesIgnored: cards.length - unique.length,
    totalSales,
    byType,
    topItems,
  };
}
