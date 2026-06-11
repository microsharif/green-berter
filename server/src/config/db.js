import mongoose from "mongoose";

/**
 * Ensures local/standalone-friendly driver flags are present on the URI.
 */
export function normalizeMongoUri(uri) {
  let out = String(uri).trim();
  // Drop any retryWrites=true so driver options / our false value win.
  out = out.replace(/([?&])retryWrites=true(&|$)/gi, (_, sep, tail) =>
    tail === "&" ? sep : ""
  );
  out = out.replace(/\?&/, "?").replace(/&&/g, "&").replace(/[?&]$/, "");

  if (!/retryWrites=false/i.test(out)) {
    out += `${out.includes("?") ? "&" : "?"}retryWrites=false`;
  }
  return out;
}

/**
 * Connects to MongoDB using the supplied URI.
 * Database name must live in the URI (e.g. mongodb://host:27017/almadot).
 */
export async function connectDatabase(uri) {
  if (!uri) {
    throw new Error(
      "Missing MONGODB_URI. Set it in server/.env before starting the API."
    );
  }

  const normalized = normalizeMongoUri(uri);

  await mongoose.connect(normalized, {
    retryWrites: false,
    retryReads: false,
  });
  return mongoose.connection;
}
