import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Item, RateCardMeta, RateCardSnapshot } from "./types";
import { applyDiscount } from "./rows";

// A Blob store connected from another project (or a project with multiple stores)
// can get an env var name like `<STORE_NAME>_BLOB_READ_WRITE_TOKEN` instead of the
// plain default — so look for either rather than assuming the exact name.
function resolveBlobToken(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  const match = Object.entries(process.env).find(([key]) => key.endsWith("_BLOB_READ_WRITE_TOKEN"));
  return match?.[1];
}

const BLOB_TOKEN = resolveBlobToken();
// Newer Blob stores skip a static token entirely: BLOB_STORE_ID plus Vercel's
// automatic OIDC token are enough, and @vercel/blob picks both up on its own as
// long as no `token` option is passed — so only add `token` when we have a real one.
const USE_BLOB = Boolean(BLOB_TOKEN || process.env.BLOB_STORE_ID);
const blobAuth = BLOB_TOKEN ? { token: BLOB_TOKEN } : {};

const LOCAL_DIR = path.join(process.cwd(), "data");
const LOCAL_CATALOG = path.join(LOCAL_DIR, "catalog.json");
const LOCAL_SEED = path.join(LOCAL_DIR, "seed-catalog.json");
const LOCAL_RATECARDS_DIR = path.join(LOCAL_DIR, "ratecards");
const LOCAL_INDEX = path.join(LOCAL_RATECARDS_DIR, "index.json");

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
  if (USE_BLOB) {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "catalog.json", limit: 1, ...blobAuth });
    if (blobs.length === 0) {
      const seed = await readJsonFile<Item[]>(LOCAL_SEED, []);
      await saveCatalog(seed);
      return seed;
    }
    const res = await fetch(blobs[0].url, { cache: "no-store" });
    return (await res.json()) as Item[];
  }
  const existing = await readJsonFile<Item[] | null>(LOCAL_CATALOG, null);
  if (existing) return existing;
  const seed = await readJsonFile<Item[]>(LOCAL_SEED, []);
  await writeJsonFile(LOCAL_CATALOG, seed);
  return seed;
}

export async function saveCatalog(items: Item[]): Promise<void> {
  if (USE_BLOB) {
    const { put } = await import("@vercel/blob");
    await put("catalog.json", JSON.stringify(items, null, 2), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      ...blobAuth,
    });
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

export async function removeItem(id: string): Promise<void> {
  const items = await getCatalog();
  await saveCatalog(items.filter((i) => i.id !== id));
}

// ---------- Rate cards ----------

export async function listRateCards(): Promise<RateCardMeta[]> {
  if (USE_BLOB) {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "ratecards/index.json", limit: 1, ...blobAuth });
    if (blobs.length === 0) return [];
    const res = await fetch(blobs[0].url, { cache: "no-store" });
    const index = (await res.json()) as RateCardMeta[];
    return index.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const index = await readJsonFile<RateCardMeta[]>(LOCAL_INDEX, []);
  return index.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveRateCard(
  snapshot: Omit<RateCardSnapshot, "id" | "createdAt" | "imageUrl" | "itemCount" | "totalAmount">,
  imageDataUrl: string
): Promise<RateCardMeta> {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const itemCount = snapshot.lineItems.length;
  const subtotal = snapshot.lineItems.reduce((sum, li) => sum + li.mrp * li.quantity, 0);
  const totalAmount = applyDiscount(subtotal, snapshot.discountPercent);
  const base64 = imageDataUrl.replace(/^data:image\/\w+;base64,/, "");
  const imageBuffer = Buffer.from(base64, "base64");

  let imageUrl: string;

  if (USE_BLOB) {
    const { put, list } = await import("@vercel/blob");
    const imgResult = await put(`ratecards/${id}.jpg`, imageBuffer, {
      access: "public",
      addRandomSuffix: false,
      contentType: "image/jpeg",
      ...blobAuth,
    });
    imageUrl = imgResult.url;

    const fullSnapshot: RateCardSnapshot = { ...snapshot, id, createdAt, imageUrl, itemCount, totalAmount };
    await put(`ratecards/${id}.json`, JSON.stringify(fullSnapshot, null, 2), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      ...blobAuth,
    });

    const { blobs } = await list({ prefix: "ratecards/index.json", limit: 1, ...blobAuth });
    const index: RateCardMeta[] =
      blobs.length > 0 ? await (await fetch(blobs[0].url, { cache: "no-store" })).json() : [];
    const meta: RateCardMeta = {
      id,
      clientName: snapshot.clientName,
      showClientName: snapshot.showClientName,
      discountPercent: snapshot.discountPercent,
      itemCount,
      totalAmount,
      createdAt,
      imageUrl,
    };
    index.push(meta);
    await put("ratecards/index.json", JSON.stringify(index, null, 2), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      ...blobAuth,
    });
    return meta;
  }

  await fs.mkdir(LOCAL_RATECARDS_DIR, { recursive: true });
  const imgPath = path.join(LOCAL_RATECARDS_DIR, `${id}.jpg`);
  await fs.writeFile(imgPath, imageBuffer);
  imageUrl = `/api/ratecards/${id}/image`;

  const fullSnapshot: RateCardSnapshot = { ...snapshot, id, createdAt, imageUrl, itemCount, totalAmount };
  await writeJsonFile(path.join(LOCAL_RATECARDS_DIR, `${id}.json`), fullSnapshot);

  const index = await readJsonFile<RateCardMeta[]>(LOCAL_INDEX, []);
  const meta: RateCardMeta = {
    id,
    clientName: snapshot.clientName,
    showClientName: snapshot.showClientName,
    discountPercent: snapshot.discountPercent,
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
  const itemCount = snapshot.lineItems.length;
  const subtotal = snapshot.lineItems.reduce((sum, li) => sum + li.mrp * li.quantity, 0);
  const totalAmount = applyDiscount(subtotal, snapshot.discountPercent);
  const base64 = imageDataUrl.replace(/^data:image\/\w+;base64,/, "");
  const imageBuffer = Buffer.from(base64, "base64");

  const meta: RateCardMeta = {
    id,
    clientName: snapshot.clientName,
    showClientName: snapshot.showClientName,
    discountPercent: snapshot.discountPercent,
    itemCount,
    totalAmount,
    createdAt: existing.createdAt,
    updatedAt,
    imageUrl: existing.imageUrl,
  };
  const fullSnapshot: RateCardSnapshot = { ...snapshot, ...meta };

  if (USE_BLOB) {
    const { put, list } = await import("@vercel/blob");
    await put(`ratecards/${id}.jpg`, imageBuffer, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "image/jpeg",
      ...blobAuth,
    });
    await put(`ratecards/${id}.json`, JSON.stringify(fullSnapshot, null, 2), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      ...blobAuth,
    });

    const { blobs } = await list({ prefix: "ratecards/index.json", limit: 1, ...blobAuth });
    const index: RateCardMeta[] =
      blobs.length > 0 ? await (await fetch(blobs[0].url, { cache: "no-store" })).json() : [];
    const nextIndex = index.map((m) => (m.id === id ? meta : m));
    await put("ratecards/index.json", JSON.stringify(nextIndex, null, 2), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      ...blobAuth,
    });
    return meta;
  }

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
  if (USE_BLOB) {
    const { del, list } = await import("@vercel/blob");
    await del([`ratecards/${id}.jpg`, `ratecards/${id}.json`], { ...blobAuth });

    const { blobs } = await list({ prefix: "ratecards/index.json", limit: 1, ...blobAuth });
    const index: RateCardMeta[] =
      blobs.length > 0 ? await (await fetch(blobs[0].url, { cache: "no-store" })).json() : [];
    const { put } = await import("@vercel/blob");
    await put(
      "ratecards/index.json",
      JSON.stringify(
        index.filter((m) => m.id !== id),
        null,
        2
      ),
      {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
        ...blobAuth,
      }
    );
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

export async function getRateCard(id: string): Promise<RateCardSnapshot | null> {
  if (USE_BLOB) {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: `ratecards/${id}.json`, limit: 1, ...blobAuth });
    if (blobs.length === 0) return null;
    const res = await fetch(blobs[0].url, { cache: "no-store" });
    return (await res.json()) as RateCardSnapshot;
  }
  return readJsonFile<RateCardSnapshot | null>(path.join(LOCAL_RATECARDS_DIR, `${id}.json`), null);
}

export async function getLocalRateCardImagePath(id: string): Promise<string> {
  return path.join(LOCAL_RATECARDS_DIR, `${id}.jpg`);
}

export const isUsingBlob = USE_BLOB;
