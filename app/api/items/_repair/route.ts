import { NextResponse } from "next/server";
import { saveCatalog } from "@/lib/storage";
import type { Item } from "@/lib/types";

// Temporary: restores catalog.json from a known-good array, bypassing getCatalog()
// (used once to recover from a Blob read failure caused by rapid overwrites).
export async function POST(req: Request) {
  const items = (await req.json()) as Item[];
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Expected a non-empty item array" }, { status: 400 });
  }
  await saveCatalog(items);
  return NextResponse.json({ ok: true, count: items.length });
}
