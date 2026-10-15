import { MongoClient, type Db } from "mongodb";

// Builds must not require runtime credentials or a running Mongo server.
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient> | undefined;

function connectClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  if (!clientPromise) {
    if (process.env.NODE_ENV === "development") {
      global._mongoClientPromise ??= new MongoClient(uri).connect();
      clientPromise = global._mongoClientPromise;
    } else {
      clientPromise = new MongoClient(uri).connect();
    }
  }
  const pending = clientPromise;
  return pending.catch((error: unknown) => {
    // Never permanently cache a rejected promise after a transient outage.
    if (clientPromise === pending) clientPromise = undefined;
    if (process.env.NODE_ENV === "development" && global._mongoClientPromise === pending) global._mongoClientPromise = undefined;
    throw error;
  });
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
  const client = await connectClient();
  const db = client.db();
  if (!indexesEnsured) indexesEnsured = ensureIndexes(db);
  const pendingIndexes = indexesEnsured;
  try {
    await pendingIndexes;
  } catch (error) {
    if (indexesEnsured === pendingIndexes) indexesEnsured = undefined;
    throw error;
  }
  return db;
}
