import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is not set");

// Next.js dev reloads this module on every route change; cache the client
// on `globalThis` so we don't open a new connection per request.
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = new MongoClient(uri).connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  clientPromise = new MongoClient(uri).connect();
}

let indexesEnsured: Promise<void> | undefined;

async function ensureIndexes(db: Db): Promise<void> {
  await Promise.all([
    db.collection("users").createIndex({ clerkUserId: 1 }, { unique: true }),
    db.collection("settings").createIndex({ key: 1 }, { unique: true }),
    db.collection("sessions").createIndex({ userId: 1, createdAt: -1 }),
  ]);
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  const db = client.db();
  if (!indexesEnsured) indexesEnsured = ensureIndexes(db);
  await indexesEnsured;
  return db;
}

export default clientPromise;
