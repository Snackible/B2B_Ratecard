import type { Item, Segment } from "./types";

export type CatalogRow = {
  key: string;
  itemId: string;
  name: string;
  category: string;
  section: string | null;
  segment: Segment;
  packLabel: string;
  grammage: number | null;
  shelfLifeDays: number | null;
  mrp: number;
};

export type SelectedRow = CatalogRow & { quantity: number };

export const BULK_SEGMENTS: Segment[] = ["Standard Grammage", "One Serving Pack", "Large Grammage"];

export function groupBySegment(rows: CatalogRow[]): Map<Segment, CatalogRow[]> {
  const map = new Map<Segment, CatalogRow[]>();
  for (const segment of BULK_SEGMENTS) map.set(segment, []);
  for (const row of rows) {
    if (!map.has(row.segment)) map.set(row.segment, []);
    map.get(row.segment)!.push(row);
  }
  return map;
}

export function buildRows(items: Item[]): CatalogRow[] {
  const rows: CatalogRow[] = [];
  for (const item of items) {
    rows.push({
      key: `${item.id}:standard`,
      itemId: item.id,
      name: item.name,
      category: item.category,
      section: item.section,
      segment: item.segment,
      packLabel: item.grammage ? `${item.grammage}g` : "Standard Pack",
      grammage: item.grammage,
      shelfLifeDays: item.shelfLifeDays,
      mrp: item.mrp,
    });
    if (item.largerPackMrp != null && item.largerPackGrammage != null) {
      rows.push({
        key: `${item.id}:larger`,
        itemId: item.id,
        name: item.name,
        category: item.category,
        section: item.section,
        segment: item.segment,
        packLabel: `${item.largerPackGrammage}g (Larger Pack)`,
        grammage: item.largerPackGrammage,
        shelfLifeDays: item.shelfLifeDays,
        mrp: item.largerPackMrp,
      });
    }
  }
  return rows;
}

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

export function formatINR(value: number): string {
  return currencyFormatter.format(value);
}

export function applyDiscount(mrp: number, discountPercent: number): number {
  return Math.round(mrp * (1 - discountPercent / 100) * 100) / 100;
}
