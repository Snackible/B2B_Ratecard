import type { HamperBoxInstance } from "./types";
import type { SelectedRow } from "./rows";
import { applyDiscount } from "./rows";

export type PricingBreakdown = {
  subtotal: number;
  discountAmount: number;
  boxCostTotal: number;
  transportAmount: number;
  addOnTotalsByName: Map<string, { quantity: number; total: number }>;
  addOnsTotal: number;
  payableAmount: number;
};

export function computePricing({
  rows,
  boxInstances,
  discountPercent,
  transportCostEnabled,
  transportCostAmount,
}: {
  rows: SelectedRow[];
  boxInstances?: HamperBoxInstance[];
  discountPercent: number;
  transportCostEnabled?: boolean;
  transportCostAmount?: number;
}): PricingBreakdown {
  const flatSubtotal = rows.reduce((sum, row) => sum + row.mrp * row.quantity, 0);
  const boxItemsSubtotal = (boxInstances ?? []).reduce(
    (sum, box) => sum + box.lineItems.reduce((s, li) => s + li.mrp * li.quantity, 0),
    0
  );
  const subtotal = flatSubtotal + boxItemsSubtotal;
  const discountAmount = subtotal - applyDiscount(subtotal, discountPercent);
  const boxCostTotal = (boxInstances ?? []).reduce((sum, box) => sum + box.boxCost, 0);
  const transportAmount = transportCostEnabled ? (transportCostAmount ?? 0) : 0;

  const addOnTotalsByName = new Map<string, { quantity: number; total: number }>();
  for (const box of boxInstances ?? []) {
    for (const sel of box.addOnSelections) {
      const existing = addOnTotalsByName.get(sel.name) ?? { quantity: 0, total: 0 };
      addOnTotalsByName.set(sel.name, { quantity: existing.quantity + sel.quantity, total: existing.total + sel.total });
    }
  }
  const addOnsTotal = [...addOnTotalsByName.values()].reduce((sum, a) => sum + a.total, 0);
  const payableAmount = subtotal - discountAmount + boxCostTotal + transportAmount + addOnsTotal;

  return { subtotal, discountAmount, boxCostTotal, transportAmount, addOnTotalsByName, addOnsTotal, payableAmount };
}
