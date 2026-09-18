import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { getCatalog, saveCatalog } from "@/lib/storage";
import type { Item } from "@/lib/types";

// One-time (re-runnable) maintenance route: the live catalog moved to MongoDB before
// cogsCost/largerPackCogsCost existed, so those two fields need to be patched into the
// already-seeded Mongo document from the committed data/catalog.json. Merges by item id
// and touches only these two fields — anything added directly to the live catalog since
// the Mongo migration (not present in the local file) is left completely untouched.
export async function POST() {
  const localPath = path.join(process.cwd(), "data", "catalog.json");
  const localItems = JSON.parse(await fs.readFile(localPath, "utf-8")) as Item[];
  const costById = new Map(localItems.map((i) => [i.id, { cogsCost: i.cogsCost, largerPackCogsCost: i.largerPackCogsCost }]));

  const liveItems = await getCatalog();
  let updated = 0;
  const merged = liveItems.map((item) => {
    const cost = costById.get(item.id);
    if (!cost) return item;
    updated++;
    return { ...item, cogsCost: cost.cogsCost, largerPackCogsCost: cost.largerPackCogsCost };
  });

  await saveCatalog(merged);
  return NextResponse.json({ ok: true, totalItems: merged.length, updated });
}
