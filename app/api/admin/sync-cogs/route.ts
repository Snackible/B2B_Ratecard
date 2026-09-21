import { NextResponse } from "next/server";
import { getCatalog, saveCatalog, addItems } from "@/lib/storage";
import { matchSheetRowsToCatalog, buildNewItemsFromCandidates, type SheetCogsRow } from "@/lib/cogsSheetSync";

// Called by the COGS master sheet's Apps Script (daily trigger + on-edit trigger) to keep
// the live catalog's cogsCost/largerPackCogsCost in sync with the sheet. Requires a shared
// secret since this is reachable from the open internet on a schedule — see COGS_SYNC_SECRET.
export async function POST(req: Request) {
  const secret = process.env.COGS_SYNC_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "COGS_SYNC_SECRET is not configured on the server" }, { status: 500 });
  }
  if (req.headers.get("x-sync-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { rows?: unknown };
  if (!Array.isArray(body.rows)) {
    return NextResponse.json({ error: "Expected { rows: [{ name, mrp, cogsCost }] }" }, { status: 400 });
  }
  const rows: SheetCogsRow[] = body.rows.filter(
    (r): r is SheetCogsRow =>
      typeof r === "object" &&
      r !== null &&
      typeof (r as SheetCogsRow).name === "string" &&
      typeof (r as SheetCogsRow).mrp === "number" &&
      typeof (r as SheetCogsRow).cogsCost === "number"
  );

  const catalog = await getCatalog();
  const { updates, matchedCount, unmatchedCatalogItems, newItemCandidates } = matchSheetRowsToCatalog(rows, catalog);

  const merged = catalog.map((item) => {
    const update = updates.get(item.id);
    if (!update) return item;
    return { ...item, cogsCost: update.cogsCost, largerPackCogsCost: update.largerPackCogsCost };
  });
  await saveCatalog(merged);

  // Sheet product families with no matching catalog item (by name or alias) get created
  // outright — "Uncategorized" and editable afterward like any manually-added item.
  const newItemInputs = buildNewItemsFromCandidates(newItemCandidates);
  const createdItems = newItemInputs.length > 0 ? await addItems(newItemInputs) : [];

  return NextResponse.json({
    ok: true,
    rowsReceived: rows.length,
    matchedCount,
    unmatchedCatalogItems,
    createdItems: createdItems.map((i) => i.name),
  });
}
