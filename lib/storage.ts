import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { isDbConfigured, getDb } from "./mongo";
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

// Primary storage is MongoDB Atlas (free tier, no card required) when MONGODB_URI
// is set. The committed local JSON files (data/catalog.json etc.) act as the seed/
// backup: the very first read bootstraps the database from them, and they're also
// the fallback used when no database is configured at all (e.g. local dev without
// a MONGODB_URI). See lib/mongo.ts for the connection.
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

// If Mongo is unreachable (outage, quota, network blip), reads fall back to the
// committed local JSON instead of throwing — so the catalog/hamper config/settings
// still load and rate cards can still be built and downloaded, even though the
// fallback data is only as fresh as the last commit and writes still fail.
async function readWithFallback<T>(dbRead: () => Promise<T>, fallback: () => Promise<T>, label: string): Promise<T> {
  try {
    return await dbRead();
  } catch (err) {
    console.error(`[storage] MongoDB unavailable for ${label}; serving local fallback data`, err);
    return fallback();
  }
}

async function writeJsonFile(file: string, data: unknown) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

// A single "config" collection holds a handful of singleton documents (catalog,
// hamper-config, settings), each identified by a fixed _id — simpler than a
// collection-per-document for data this small. Mongo's driver defaults `_id` to
// ObjectId, so these collections are typed with a string `_id` explicitly.
type ConfigDoc = { _id: string } & Record<string, unknown>;

function configCollection() {
  return getDb().then((db) => db.collection<ConfigDoc>("config"));
}

async function getConfigDoc<T>(id: string): Promise<T | null> {
  const collection = await configCollection();
  const doc = await collection.findOne({ _id: id });
  return doc ? (doc as unknown as T) : null;
}

async function setConfigDoc(id: string, data: Record<string, unknown>): Promise<void> {
  const collection = await configCollection();
  await collection.replaceOne({ _id: id }, { _id: id, ...data }, { upsert: true });
}

// ---------- Catalog ----------

async function readLocalCatalog(): Promise<Item[]> {
  const existing = await readJsonFile<Item[] | null>(LOCAL_CATALOG, null);
  if (existing) return existing;
  return readJsonFile<Item[]>(LOCAL_SEED, []);
}

export async function getCatalog(): Promise<Item[]> {
  if (isDbConfigured) {
    return readWithFallback(
      async () => {
        const doc = await getConfigDoc<{ items: Item[] }>("catalog");
        if (doc) return doc.items;
        // Not seeded yet — bootstrap the database from the committed backup file.
        const seed = await readLocalCatalog();
        await saveCatalog(seed);
        return seed;
      },
      readLocalCatalog,
      "catalog"
    );
  }
  const existing = await readJsonFile<Item[] | null>(LOCAL_CATALOG, null);
  if (existing) return existing;
  const seed = await readJsonFile<Item[]>(LOCAL_SEED, []);
  try {
    await writeJsonFile(LOCAL_CATALOG, seed);
  } catch {
    // Read-only filesystem — the seed is still usable for this request.
  }
  return seed;
}

export async function saveCatalog(items: Item[]): Promise<void> {
  if (isDbConfigured) {
    await setConfigDoc("catalog", { items });
    return;
  }
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

async function readLocalHamperConfig(): Promise<HamperConfig> {
  return withHamperConfigDefaults(await readJsonFile<Partial<HamperConfig>>(LOCAL_HAMPER_CONFIG, EMPTY_HAMPER_CONFIG));
}

export async function getHamperConfig(): Promise<HamperConfig> {
  if (isDbConfigured) {
    return readWithFallback(
      async () => {
        const doc = await getConfigDoc<Partial<HamperConfig>>("hamper-config");
        if (doc) return withHamperConfigDefaults(doc);
        const seed = await readLocalHamperConfig();
        await saveHamperConfig(seed);
        return seed;
      },
      readLocalHamperConfig,
      "hamper config"
    );
  }
  return readLocalHamperConfig();
}

export async function saveHamperConfig(config: HamperConfig): Promise<void> {
  if (isDbConfigured) {
    await setConfigDoc("hamper-config", config);
    return;
  }
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

async function readLocalSettings(): Promise<AppSettings> {
  const existing = await readJsonFile<Partial<AppSettings> | null>(LOCAL_SETTINGS, null);
  return { ...DEFAULT_SETTINGS, ...existing };
}

export async function getSettings(): Promise<AppSettings> {
  if (isDbConfigured) {
    return readWithFallback(
      async () => {
        const doc = await getConfigDoc<Partial<AppSettings>>("settings");
        if (doc) return { ...DEFAULT_SETTINGS, ...doc };
        const seeded = await readLocalSettings();
        await saveSettings(seeded);
        return seeded;
      },
      readLocalSettings,
      "settings"
    );
  }
  return readLocalSettings();
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  if (isDbConfigured) {
    await setConfigDoc("settings", settings);
    return;
  }
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

type RateCardDoc = RateCardSnapshot & { _id: string; imageBase64?: string };

function ratecardsCollection() {
  return getDb().then((db) => db.collection<RateCardDoc>("ratecards"));
}

async function readLocalRateCardIndex(): Promise<RateCardMeta[]> {
  const index = await readJsonFile<RateCardMeta[]>(LOCAL_INDEX, []);
  return index.map(withMetaDefaults).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listRateCards(): Promise<RateCardMeta[]> {
  if (isDbConfigured) {
    return readWithFallback(
      async () => {
        const collection = await ratecardsCollection();
        const docs = await collection
          .find({}, { projection: { imageBase64: 0, lineItems: 0, boxInstances: 0 } })
          .toArray();
        return docs
          .map((d) => withMetaDefaults(d as unknown as RateCardMeta))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      },
      readLocalRateCardIndex,
      "saved rate cards"
    );
  }
  return readLocalRateCardIndex();
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

function buildMeta(
  id: string,
  createdAt: string,
  imageUrl: string,
  itemCount: number,
  totalAmount: number,
  snapshot: {
    orderType: RateCardSnapshot["orderType"];
    clientName: RateCardSnapshot["clientName"];
    showClientName: boolean;
    discountPercent: number;
    transportCostEnabled: boolean;
    transportCostAmount: number;
    boxCostTotal: number;
    addOnsCostTotal: number;
  }
): RateCardMeta {
  return {
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
}

export async function saveRateCard(
  snapshot: Omit<RateCardSnapshot, "id" | "createdAt" | "imageUrl" | "itemCount" | "totalAmount">,
  imageDataUrl: string
): Promise<RateCardMeta> {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const { itemCount, totalAmount } = computeTotals(snapshot);
  const base64 = imageDataUrl.replace(/^data:image\/\w+;base64,/, "");
  const imageUrl = `/api/ratecards/${id}/image`;
  const fullSnapshot: RateCardSnapshot = { ...snapshot, id, createdAt, imageUrl, itemCount, totalAmount };
  const meta = buildMeta(id, createdAt, imageUrl, itemCount, totalAmount, snapshot);

  if (isDbConfigured) {
    const collection = await ratecardsCollection();
    await collection.insertOne({ _id: id, ...fullSnapshot, imageBase64: base64 });
    return meta;
  }

  await fs.mkdir(LOCAL_RATECARDS_DIR, { recursive: true });
  await fs.writeFile(path.join(LOCAL_RATECARDS_DIR, `${id}.jpg`), Buffer.from(base64, "base64"));
  await writeJsonFile(path.join(LOCAL_RATECARDS_DIR, `${id}.json`), fullSnapshot);

  const index = await readJsonFile<RateCardMeta[]>(LOCAL_INDEX, []);
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

  const meta: RateCardMeta = {
    ...buildMeta(id, existing.createdAt, existing.imageUrl, itemCount, totalAmount, snapshot),
    updatedAt,
  };
  const fullSnapshot: RateCardSnapshot = { ...snapshot, ...meta };

  if (isDbConfigured) {
    const collection = await ratecardsCollection();
    await collection.replaceOne({ _id: id }, { ...fullSnapshot, imageBase64: base64 });
    return meta;
  }

  await fs.writeFile(path.join(LOCAL_RATECARDS_DIR, `${id}.jpg`), Buffer.from(base64, "base64"));
  await writeJsonFile(path.join(LOCAL_RATECARDS_DIR, `${id}.json`), fullSnapshot);
  const index = await readJsonFile<RateCardMeta[]>(LOCAL_INDEX, []);
  await writeJsonFile(
    LOCAL_INDEX,
    index.map((m) => (m.id === id ? meta : m))
  );
  return meta;
}

export async function deleteRateCard(id: string): Promise<void> {
  if (isDbConfigured) {
    const collection = await ratecardsCollection();
    await collection.deleteOne({ _id: id });
    return;
  }

  await fs.rm(path.join(LOCAL_RATECARDS_DIR, `${id}.jpg`), { force: true });
  await fs.rm(path.join(LOCAL_RATECARDS_DIR, `${id}.json`), { force: true });
  const index = await readJsonFile<RateCardMeta[]>(LOCAL_INDEX, []);
  await writeJsonFile(
    LOCAL_INDEX,
    index.filter((m) => m.id !== id)
  );
}

async function readLocalRateCard(id: string): Promise<RateCardSnapshot | null> {
  return readJsonFile<RateCardSnapshot | null>(path.join(LOCAL_RATECARDS_DIR, `${id}.json`), null);
}

export async function getRateCard(id: string): Promise<RateCardSnapshot | null> {
  const snapshot: RateCardSnapshot | null = isDbConfigured
    ? await readWithFallback(
        async () => {
          const collection = await ratecardsCollection();
          const doc = await collection.findOne({ _id: id }, { projection: { imageBase64: 0 } });
          return doc ? (doc as unknown as RateCardSnapshot) : null;
        },
        () => readLocalRateCard(id),
        "rate card"
      )
    : await readLocalRateCard(id);
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

async function readLocalRateCardImage(id: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(path.join(LOCAL_RATECARDS_DIR, `${id}.jpg`));
  } catch {
    return null;
  }
}

export async function getRateCardImageBuffer(id: string): Promise<Buffer | null> {
  if (isDbConfigured) {
    return readWithFallback(
      async () => {
        const collection = await ratecardsCollection();
        const doc = await collection.findOne({ _id: id }, { projection: { imageBase64: 1 } });
        return doc?.imageBase64 ? Buffer.from(doc.imageBase64, "base64") : null;
      },
      () => readLocalRateCardImage(id),
      "rate card image"
    );
  }
  return readLocalRateCardImage(id);
}
