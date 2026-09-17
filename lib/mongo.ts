import { createSecureContext } from "node:tls";
import { MongoClient, type Db } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || "b2b_ratecard";

export const isDbConfigured = Boolean(MONGODB_URI);

declare global {
  // Cached across hot reloads in dev and warm serverless invocations in production,
  // so we don't open a new connection on every request.
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  if (!MONGODB_URI) throw new Error("MONGODB_URI is not set");
  if (!global._mongoClientPromise) {
    // Force TLS 1.2: Atlas can reject a reused TLS 1.3 session ticket from a
    // serverless function that froze between invocations ("SSL alert number 80").
    const promise = new MongoClient(MONGODB_URI, {
      secureContext: createSecureContext({ maxVersion: "TLSv1.2" }),
    }).connect();
    // Drop the cache on failure so the next request retries with a fresh
    // connection instead of replaying the same broken promise forever.
    promise.catch(() => {
      if (global._mongoClientPromise === promise) global._mongoClientPromise = undefined;
    });
    global._mongoClientPromise = promise;
  }
  return global._mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(DB_NAME);
}
