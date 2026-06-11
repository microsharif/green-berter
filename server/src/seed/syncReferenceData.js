import "dotenv/config";
import mongoose from "mongoose";
import { normalizeMongoUri } from "../config/db.js";

const COLLECTIONS = ["listing_categories", "listing_locations"];

async function openConnection(uri, label) {
  if (!uri) {
    throw new Error(
      `Missing ${label}. Set SOURCE_MONGODB_URI / TARGET_MONGODB_URI in server/.env`
    );
  }
  const conn = mongoose.createConnection(normalizeMongoUri(uri), {
    retryWrites: false,
    retryReads: false,
  });
  await conn.asPromise();
  return conn;
}

async function syncCollection(sourceDb, targetDb, name) {
  const docs = await sourceDb.collection(name).find({}).toArray();
  const target = targetDb.collection(name);
  await target.deleteMany({});
  if (docs.length > 0) {
    await target.insertMany(docs, { ordered: true });
  }
  return docs.length;
}

async function run() {
  const sourceUri =
    process.env.SOURCE_MONGODB_URI || process.env.MONGODB_URI;
  const targetUri = process.env.TARGET_MONGODB_URI;

  if (!targetUri) {
    throw new Error(
      "Set TARGET_MONGODB_URI in server/.env to your VPS MongoDB connection string."
    );
  }

  if (normalizeMongoUri(sourceUri) === normalizeMongoUri(targetUri)) {
    throw new Error("SOURCE and TARGET MongoDB URIs must be different.");
  }

  const source = await openConnection(sourceUri, "SOURCE_MONGODB_URI");
  const target = await openConnection(targetUri, "TARGET_MONGODB_URI");

  console.log(`Source DB: ${source.name}`);
  console.log(`Target DB: ${target.name}\n`);

  try {
    for (const name of COLLECTIONS) {
      const count = await syncCollection(source.db, target.db, name);
      console.log(`${name}: copied ${count} document(s)`);
    }
    console.log("\nReference data sync complete.");
  } finally {
    await source.close();
    await target.close();
  }
}

run().catch((err) => {
  console.error("Sync failed:", err.message || err);
  process.exitCode = 1;
});
