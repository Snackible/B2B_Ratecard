import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type {
  AddOn,
  AppSettings,
  Box,
  BoxType,
  HamperConfig,
  Item,
  NewAddOnInput,
  NewBoxInput,
  NewBoxTypeInput,
  RateCardMeta,
  RateCardSnapshot,
} from "./types";
import { applyDiscount } from "./rows";

// Catalog/hamper-config/settings are committed JSON files rather than an external
// object store — the Vercel Blob store previously used for this hit its Hobby-plan
// monthly operation cap and got suspended, and a paid alternative wasn't an option.
// Reads work fine in production (these files are bundled with the deployment);
// writes below (add/edit/delete) only persist locally, since Vercel's production
// filesystem is read-only outside /tmp. Rate card history is local-only for the
// same reason — see LOCAL_RATECARDS_DIR.
const LOCAL_DIR = path.join(process.cwd(), "data");
const LOCAL_CATALOG = path.join(LOCAL_DIR, "catalog.json");
const LOCAL_SEED = path.join(LOCAL_DIR, "seed-catalog.json");
const LOCAL_RATECARDS_DIR = path.join(LOCAL_DIR, "ratecards");
const LOCAL_INDEX = path.join(LOCAL_RATECARDS_DIR, "index.json");
const LOCAL_HAMPER_CONFIG = path.join(LOCAL_DIR, "hamper-config.json");
const LOCAL_SETTINGS = path.join(LOCAL_DIR, "settings.json");

const EMPTY_HAMPER_CONFIG: HamperConfig = { boxTypes: [], boxes: [], addOns: [] };
const DEFAULT_SETTINGS: AppSettings = { transportCost: 0 };

async function readJsonFile<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile(file: string, data: unknown) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

// ---------- Catalog ----------

export async function getCatalog(): Promise<Item[]> {
  const existing = await readJsonFile<Item[] | null>(LOCAL_CATALOG, null);
  if (existing) return existing;
  const seed = await readJsonFile<Item[]>(LOCAL_SEED, []);
  try {
    await writeJsonFile(LOCAL_CATALOG, seed);
  } catch {
    // Read-only filesystem (production without a persisted catalog.json) — the
    // seed is still usable for this request even though it couldn't be cached.
  }
  return seed;
}

export async function saveCatalog(items: Item[]): Promise<void> {
  await writeJsonFile(LOCAL_CATALOG, items);
}

export async function addItem(input: Omit<Item, "id">): Promise<Item> {
  const items = await getCatalog();
  const item: Item = { ...input, id: randomUUID() };
  items.push(item);
  await saveCatalog(items);
  return item;
}

// Adds every input in a single read-modify-write, so bulk imports don't need
// one API call per item (sequential single-item writes race each other — see
// the "never bulk-write the catalog sequentially" lesson).
export async function addItems(inputs: Omit<Item, "id">[]): Promise<Item[]> {
  const items = await getCatalog();
  const created = inputs.map((input) => ({ ...input, id: randomUUID() }));
  items.push(...created);
  await saveCatalog(items);
  return created;
}

export async function updateItem(id: string, patch: Partial<Omit<Item, "id">>): Promise<Item | null> {
  const items = await getCatalog();
  const index = items.findIndex((i) => i.id === id);
  if (index === -1) return null;
  const item: Item = { ...items[index], ...patch };
  items[index] = item;
  await saveCatalog(items);
  return item;
}

export async function removeItem(id: string): Promise<void> {
  const items = await getCatalog();
  await saveCatalog(items.filter((i) => i.id !== id));
}

// ---------- Hamper config (box types + boxes) ----------

// Backfills fields introduced after some configs were already saved (e.g. addOns,
// per-box minItems/maxItems), so older stored configs don't come back with
// missing arrays/fields.
function withHamperConfigDefaults(config: Partial<HamperConfig>): HamperConfig {
  return {
    boxTypes: config.boxTypes ?? [],
    boxes: (config.boxes ?? []).map((b) => ({
      ...b,
      minItems: b.minItems ?? null,
      maxItems: b.maxItems ?? null,
    })),
    addOns: config.addOns ?? [],
  };
}

export async function getHamperConfig(): Promise<HamperConfig> {
  return withHamperConfigDefaults(await readJsonFile<Partial<HamperConfig>>(LOCAL_HAMPER_CONFIG, EMPTY_HAMPER_CONFIG));
}

export async function saveHamperConfig(config: HamperConfig): Promise<void> {
  await writeJsonFile(LOCAL_HAMPER_CONFIG, config);
}

export async function addBoxType(input: NewBoxTypeInput): Promise<BoxType> {
  const config = await getHamperConfig();
  const boxType: BoxType = { ...input, id: randomUUID() };
  config.boxTypes.push(boxType);
  await saveHamperConfig(config);
  return boxType;
}

export async function addBox(input: NewBoxInput): Promise<Box> {
  const config = await getHamperConfig();
  const box: Box = { ...input, id: randomUUID() };
  config.boxes.push(box);
  await saveHamperConfig(config);
  return box;
}

// Adds many boxes in a single read-modify-write — see the "never bulk-write
// sequentially" lesson; looping addBox races itself under back-to-back calls.
export async function addBoxes(inputs: NewBoxInput[]): Promise<Box[]> {
  const config = await getHamperConfig();
  const created = inputs.map((input) => ({ ...input, id: randomUUID() }));
  config.boxes.push(...created);
  await saveHamperConfig(config);
  return created;
}

export async function updateBox(id: string, input: NewBoxInput): Promise<Box | null> {
  const config = await getHamperConfig();
  const index = config.boxes.findIndex((b) => b.id === id);
  if (index === -1) return null;
  const box: Box = { ...input, id };
  config.boxes[index] = box;
  await saveHamperConfig(config);
  return box;
}

export async function removeBox(id: string): Promise<void> {
  const config = await getHamperConfig();
  config.boxes = config.boxes.filter((b) => b.id !== id);
  await saveHamperConfig(config);
}

export async function removeBoxType(id: string): Promise<void> {
  const config = await getHamperConfig();
  config.boxTypes = config.boxTypes.filter((bt) => bt.id !== id);
  config.boxes = config.boxes.filter((b) => b.boxTypeId !== id);
  await saveHamperConfig(config);
}

// Merges the provided sections into the current config in a single read-modify-write.
// Any array included in `patch` replaces that section wholesale (boxTypes/boxes/addOns
// are each all-or-nothing) — used for both one-off bulk edits and single-field tweaks
// (e.g. an add-on's cost) sent as a full replacement array.
export async function updateHamperConfig(patch: Partial<HamperConfig>): Promise<HamperConfig> {
  const config = await getHamperConfig();
  const next: HamperConfig = {
    boxTypes: patch.boxTypes ?? config.boxTypes,
    boxes: patch.boxes ?? config.boxes,
    addOns: patch.addOns ?? config.addOns,
  };
  await saveHamperConfig(next);
  return next;
}

export async function addAddOn(input: NewAddOnInput): Promise<AddOn> {
  const config = await getHamperConfig();
  const addOn: AddOn = { ...input, id: randomUUID() };
  config.addOns.push(addOn);
  await saveHamperConfig(config);
  return addOn;
}

export async function removeAddOn(id: string): Promise<void> {
  const config = await getHamperConfig();
  config.addOns = config.addOns.filter((a) => a.id !== id);
  await saveHamperConfig(config);
}

// ---------- Settings ----------

export async function getSettings(): Promise<AppSettings> {
  const existing = await readJsonFile<Partial<AppSettings> | null>(LOCAL_SETTINGS, null);
  return { ...DEFAULT_SETTINGS, ...existing };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await writeJsonFile(LOCAL_SETTINGS, settings);
}

// ---------- Rate cards ----------

// Backfills fields introduced after some rate cards were already saved, so old
// history entries keep loading instead of rendering as bulk/hamper hybrids.
function withMetaDefaults(meta: Partial<RateCardMeta> & Pick<RateCardMeta, "id" | "createdAt" | "imageUrl">): RateCardMeta {
  return {
    orderType: "bulk",
    clientName: null,
    showClientName: false,
    discountPercent: 0,
    transportCostEnabled: false,
    transportCostAmount: 0,
    boxCostTotal: 0,
    addOnsCostTotal: 0,
    itemCount: 0,
    totalAmount: 0,
    ...meta,
  };
}

export async function listRateCards(): Promise<RateCardMeta[]> {
  const index = await readJsonFile<RateCardMeta[]>(LOCAL_INDEX, []);
  return index.map(withMetaDefaults).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function computeTotals(snapshot: {
  lineItems: RateCardSnapshot["lineItems"];
  boxInstances?: RateCardSnapshot["boxInstances"];
  discountPercent: number;
  transportCostEnabled: boolean;
  transportCostAmount: number;
  boxCostTotal: number;
  addOnsCostTotal: number;
}) {
  const allLineItems = [
    ...snapshot.lineItems,
    ...(snapshot.boxInstances?.flatMap((b) => b.lineItems) ?? []),
  ];
  const itemCount = allLineItems.length;
  const subtotal = allLineItems.reduce((sum, li) => sum + li.mrp * li.quantity, 0);
  const discounted = applyDiscount(subtotal, snapshot.discountPercent);
  const transport = snapshot.transportCostEnabled ? snapshot.transportCostAmount : 0;
  const totalAmount = discounted + snapshot.boxCostTotal + transport + snapshot.addOnsCostTotal;
  return { itemCount, totalAmount };
}

export async function saveRateCard(
  snapshot: Omit<RateCardSnapshot, "id" | "createdAt" | "imageUrl" | "itemCount" | "totalAmount">,
  imageDataUrl: string
): Promise<RateCardMeta> {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const { itemCount, totalAmount } = computeTotals(snapshot);
  const base64 = imageDataUrl.replace(/^data:image\/\w+;base64,/, "");
  const imageBuffer = Buffer.from(base64, "base64");

  await fs.mkdir(LOCAL_RATECARDS_DIR, { recursive: true });
  const imgPath = path.join(LOCAL_RATECARDS_DIR, `${id}.jpg`);
  await fs.writeFile(imgPath, imageBuffer);
  const imageUrl = `/api/ratecards/${id}/image`;

  const fullSnapshot: RateCardSnapshot = { ...snapshot, id, createdAt, imageUrl, itemCount, totalAmount };
  await writeJsonFile(path.join(LOCAL_RATECARDS_DIR, `${id}.json`), fullSnapshot);

  const index = await readJsonFile<RateCardMeta[]>(LOCAL_INDEX, []);
  const meta: RateCardMeta = {
    id,
    orderType: snapshot.orderType,
    clientName: snapshot.clientName,
    showClientName: snapshot.showClientName,
    discountPercent: snapshot.discountPercent,
    transportCostEnabled: snapshot.transportCostEnabled,
    transportCostAmount: snapshot.transportCostAmount,
    boxCostTotal: snapshot.boxCostTotal,
    addOnsCostTotal: snapshot.addOnsCostTotal,
    itemCount,
    totalAmount,
    createdAt,
    imageUrl,
  };
  index.push(meta);
  await writeJsonFile(LOCAL_INDEX, index);
  return meta;
}

export async function updateRateCard(
  id: string,
  snapshot: Omit<RateCardSnapshot, "id" | "createdAt" | "updatedAt" | "imageUrl" | "itemCount" | "totalAmount">,
  imageDataUrl: string
): Promise<RateCardMeta | null> {
  const existing = await getRateCard(id);
  if (!existing) return null;

  const updatedAt = new Date().toISOString();
  const { itemCount, totalAmount } = computeTotals(snapshot);
  const base64 = imageDataUrl.replace(/^data:image\/\w+;base64,/, "");
  const imageBuffer = Buffer.from(base64, "base64");

  const meta: RateCardMeta = {
    id,
    orderType: snapshot.orderType,
    clientName: snapshot.clientName,
    showClientName: snapshot.showClientName,
    discountPercent: snapshot.discountPercent,
    transportCostEnabled: snapshot.transportCostEnabled,
    transportCostAmount: snapshot.transportCostAmount,
    boxCostTotal: snapshot.boxCostTotal,
    addOnsCostTotal: snapshot.addOnsCostTotal,
    itemCount,
    totalAmount,
    createdAt: existing.createdAt,
    updatedAt,
    imageUrl: existing.imageUrl,
  };
  const fullSnapshot: RateCardSnapshot = { ...snapshot, ...meta };

  await fs.writeFile(path.join(LOCAL_RATECARDS_DIR, `${id}.jpg`), imageBuffer);
  await writeJsonFile(path.join(LOCAL_RATECARDS_DIR, `${id}.json`), fullSnapshot);
  const index = await readJsonFile<RateCardMeta[]>(LOCAL_INDEX, []);
  await writeJsonFile(
    LOCAL_INDEX,
    index.map((m) => (m.id === id ? meta : m))
  );
  return meta;
}

export async function deleteRateCard(id: string): Promise<void> {
  await fs.rm(path.join(LOCAL_RATECARDS_DIR, `${id}.jpg`), { force: true });
  await fs.rm(path.join(LOCAL_RATECARDS_DIR, `${id}.json`), { force: true });
  const index = await readJsonFile<RateCardMeta[]>(LOCAL_INDEX, []);
  await writeJsonFile(
    LOCAL_INDEX,
    index.filter((m) => m.id !== id)
  );
}

export async function getRateCard(id: string): Promise<RateCardSnapshot | null> {
  const snapshot = await readJsonFile<RateCardSnapshot | null>(path.join(LOCAL_RATECARDS_DIR, `${id}.json`), null);
  if (!snapshot) return null;
  return {
    ...withMetaDefaults(snapshot),
    lineItems: snapshot.lineItems ?? [],
    boxInstances: snapshot.boxInstances?.map((b) => ({
      ...b,
      quantity: b.quantity ?? 1,
      boxCostManual: b.boxCostManual ?? false,
      transportCostManual: b.transportCostManual ?? false,
      addOnSelections: (b.addOnSelections ?? []).map((a) => ({ ...a, perBox: a.perBox ?? true })),
    })),
  };
}

export async function getLocalRateCardImagePath(id: string): Promise<string> {
  return path.join(LOCAL_RATECARDS_DIR, `${id}.jpg`);
}
