import type { Item } from "./types";

// The COGS master sheet and the app catalog are maintained independently and don't use
// the same product names (different word order, spelling, or qualifiers) — e.g. the sheet
// says "Jowar Chips Cheddar Cheese", the catalog says "Cheddar Cheese Jowar Chips". This
// maps catalog item name -> the sheet's product name(s) so incoming sheet rows can be
// matched back to the right catalog item. An array covers a name the sheet itself spells
// inconsistently across its own rows (e.g. "Khakra" vs "Khakhra").  Only covers "Standard
// Grammage" items, since the sheet doesn't price single-serve packs at all. Items with no
// entry here use their own name directly (the sheet already matches exactly).
export const COGS_SHEET_NAME_ALIASES: Record<string, string | string[]> = {
  "Chatpata Crunch Ragi Chips": "Ragi Chips (Chatpata Crunch)",
  "Sriracha Quinoa Puffs": "Siracha Quinoa Puffs",
  "Flaming Hot Cheese Quinoa Puffs": "Flamin Hot Cheese Quinoa Puffs",
  "Cheese Dosa Khakra": ["Cheese Dosa Khakhra", "Cheese Dosa Khakra"],
  "Tomato Dosa Khakra": ["Tomato Dosa Khakhra", "Tomato Dosa Khakra"],
  "Cheddar Cheese Millet Fingers": "Cheese Millet Fingers",
  "Sour Cream & Onion Multigrain Chips": "Multigrain chips Sour Cream and Onion",
  "Cheddar Cheese Jowar Chips": "Jowar Chips Cheddar Cheese",
  "Sweet Chilli Jowar Chips": "Jowar Chips Sweet Chilli",
  "Chatpata Masala Jowar Chips": "Jowar Chips Chatpata",
  "Protein Pudina Bhujia": "Millet Protein Bhujiya Pudina",
  "Protein Masala Bhujia": "Millet Protein Bhujiya Masala",
  "Thai Chilli Protein Popped Chips": "Protein Popped chips Thai",
  "Pani Puri Protein Popped Chips": "Protein Popped chips Pani Puri",
  "Korean BBQ Chickpea Popped Chips": "Korean BBQ Popped Chips",
  "Truffle Chickpea Popped Chips": "Truffle Popped Chips",
  "Himalayan Pink Salt & Pepper Popped Chips": "Himalayan Pink Salt and Pepper Popped Chips",
  "Cheese & Herbs Multigrain Chips": "Multigrain chips Cheese and Herb",
  "Lime & Sriracha Chickpea Puffs": "Lime Sricha chickpea Puffs",
  "Baked Mini Samosas": "Baked Mini Samosa",
  "Peanut Chikki": "PEANUT CHIKKI",
  "Vanilla & Seeds Chikki": "VANILLA & SEEDS CHIKKI",
  "Coconut Chikki": "COCONUT CHIKKI",
  "Sweet Chilli Protien Chakli": "Chakli Sweet Chilli",
  "Cheddar Cheese Protien Chakli": "Chakli Cheddar Cheese",
  "Pistachio Dip with Biscuit Sticks": "Biscuit Sticks with Pistachio Dip",
  "Hazelnut Dip with Biscuit Sticks": "Biscuit Sticks with Hazelnut dip",
  "Chocolatey Dip with Biscuit Sticks": "Biscuit Sticks with Chocolaty Dip",
  "Caramel Dip with Biscuit Sticks": "Biscuit Sticks with Salted Caramel Dip",
  "Vanilla Creme Dip with Biscuit Sticks": "Biscuit Sticks with Crispies & Creame Dip",
  "Spicy Mayo Dip with Jalapeño Ragi Chips": "Spicy Mayo Dip Jalapeno Ragi chips",
  "Cheesy Jalapeño Dip with Piri Piri Ragi Chips": "Cheesy Jalapeno Dip Peri peri ragi chips",
  "Baked pizza Sticks with a Chessy Jalapeno Dip": "Baked Pizza Sticks with a Cheesy Jalapeno Dip",
  "Pistachio Spread": "Pstachio Spread",
  "Chocolate Spread": "Chocolatey Spread",
  "Jowar Bhakarwadi": "Bhakarwadi",
};

export type SheetCogsRow = { name: string; mrp: number; cogsCost: number };

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[-–+]/g, " ")
    .replace(/\d+\s*gm?\b/g, "")
    .replace(/[^a-z& ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function candidateNamesFor(catalogName: string): string[] {
  const alias = COGS_SHEET_NAME_ALIASES[catalogName];
  const names = alias ? (Array.isArray(alias) ? alias : [alias]) : [catalogName];
  return names.map(normalize);
}

function resolvePair(
  candidates: SheetCogsRow[],
  baseMrp: number,
  largeMrp: number | null
): { base: number | null; large: number | null } {
  const sorted = [...candidates].sort((a, b) => a.mrp - b.mrp);
  let baseRow = sorted.find((c) => c.mrp === baseMrp) ?? null;
  let largeRow = largeMrp != null ? (sorted.find((c) => c.mrp === largeMrp) ?? null) : null;

  // The sheet's price has probably drifted from the catalog's, but it's still clearly the
  // same product — fall back to position (lowest price = base pack, highest = larger pack)
  // for whichever slot didn't get an exact match, using only rows the other slot didn't
  // already claim.
  if (!baseRow && !largeRow) {
    if (sorted.length === 1) {
      baseRow = sorted[0];
    } else if (sorted.length >= 2) {
      baseRow = sorted[0];
      if (largeMrp != null) largeRow = sorted[sorted.length - 1];
    }
  } else if (!largeRow && largeMrp != null) {
    const remaining = sorted.filter((c) => c !== baseRow);
    if (remaining.length > 0) largeRow = remaining[remaining.length - 1];
  } else if (!baseRow) {
    const remaining = sorted.filter((c) => c !== largeRow);
    if (remaining.length > 0) baseRow = remaining[0];
  }

  return { base: baseRow?.cogsCost ?? null, large: largeRow?.cogsCost ?? null };
}

export type CogsSyncResult = {
  updates: Map<string, { cogsCost: number | null; largerPackCogsCost: number | null }>;
  matchedCount: number;
  unmatchedCatalogItems: string[];
};

// Matches incoming sheet rows (Product Name, FG MRP, Total COGS — the same three columns
// the sheet has always had) against the live "Standard Grammage" catalog items, via the
// alias table above plus a price-based tiebreak between a product's pack sizes.
export function matchSheetRowsToCatalog(sheetRows: SheetCogsRow[], catalogItems: Item[]): CogsSyncResult {
  const byNormalizedName = new Map<string, SheetCogsRow[]>();
  for (const row of sheetRows) {
    const key = normalize(row.name);
    if (!byNormalizedName.has(key)) byNormalizedName.set(key, []);
    byNormalizedName.get(key)!.push(row);
  }

  const updates = new Map<string, { cogsCost: number | null; largerPackCogsCost: number | null }>();
  const unmatchedCatalogItems: string[] = [];

  for (const item of catalogItems) {
    if (item.segment !== "Standard Grammage") continue;
    const candidates = candidateNamesFor(item.name).flatMap((n) => byNormalizedName.get(n) ?? []);
    if (candidates.length === 0) {
      unmatchedCatalogItems.push(item.name);
      continue;
    }
    const { base, large } = resolvePair(candidates, item.mrp, item.largerPackMrp);
    if (base == null && large == null) {
      unmatchedCatalogItems.push(item.name);
      continue;
    }
    updates.set(item.id, { cogsCost: base, largerPackCogsCost: item.largerPackMrp != null ? large : null });
  }

  return { updates, matchedCount: updates.size, unmatchedCatalogItems };
}
