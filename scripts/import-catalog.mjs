// One-time import: converts IGP_Segregated_Ratecard.xlsx into data/seed-catalog.json.
// Not part of the app runtime — run manually with `node scripts/import-catalog.mjs`.
import XLSX from "xlsx";
import fs from "node:fs";
import path from "node:path";

const SRC = path.join(process.cwd(), "IGP_Segregated_Ratecard.xlsx");
const OUT = path.join(process.cwd(), "data", "seed-catalog.json");

function clean(str) {
  if (typeof str !== "string") return str;
  return str.replace(/�/g, "ñ").replace(/\s+$/g, "").trim();
}

function num(v) {
  if (v === undefined || v === null || v === "" || v === "NA") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

const wb = XLSX.readFile(SRC);
const items = [];
let idCounter = 1;

// Sheet 1: "Standard Grammage" — has section banner rows (only col A filled) and category+product rows.
{
  const ws = wb.Sheets["Standard Grammage"];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
  let currentSection = null;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => c === null || c === "")) continue;
    const [category, product, grammage, mrp, lpGrammage, lpMrp, shelfLife] = row;
    const isSectionBanner = category && !product && !mrp;
    if (isSectionBanner) {
      currentSection = clean(category);
      continue;
    }
    if (!product) continue;
    items.push({
      id: `std-${idCounter++}`,
      segment: "Standard Grammage",
      section: currentSection,
      category: clean(category),
      name: clean(product),
      grammage: num(grammage),
      mrp: num(mrp),
      largerPackGrammage: num(lpGrammage),
      largerPackMrp: num(lpMrp),
      shelfLifeDays: num(shelfLife),
    });
  }
}

// Sheet 2: "One Serving Pack" — flat, no sections, no larger-pack fields.
{
  const ws = wb.Sheets["One Serving Pack"];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => c === null || c === "")) continue;
    const [category, product, grammage, mrp, shelfLife] = row;
    if (!product) continue;
    items.push({
      id: `single-${idCounter++}`,
      segment: "One Serving Pack",
      section: null,
      category: clean(category),
      name: clean(product),
      grammage: num(grammage),
      mrp: num(mrp),
      largerPackGrammage: null,
      largerPackMrp: null,
      shelfLifeDays: num(shelfLife),
    });
  }
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(items, null, 2));
console.log(`Wrote ${items.length} items to ${OUT}`);
