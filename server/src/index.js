import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import mongoose from "mongoose";

import { connectDatabase } from "./config/db.js";
import { PUBLIC_UPLOAD_PATH, UPLOAD_ROOT } from "./config/upload.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/auth.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import locationRoutes from "./routes/location.routes.js";
import claimRoutes from "./routes/claim.routes.js";
import listingRoutes from "./routes/listing.routes.js";
import membershipRoutes from "./routes/membership.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import userRoutes from "./routes/user.routes.js";
import contactRoutes from "./routes/contact.routes.js";

const PORT = Number(process.env.PORT) || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";
const configuredOrigins = CLIENT_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const isDev = process.env.NODE_ENV !== "production";

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (configuredOrigins.includes(origin)) return true;
  // Vite may fall back to 5174, 5175, etc. when 5173 is already in use.
  if (isDev && /^http:\/\/localhost:\d+$/.test(origin)) return true;
  return false;
}

const app = express();

// `req.ip` should come from the first proxy when deployed behind one.
app.set("trust proxy", 1);

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.json({
    ok: true,
    db: connected ? "connected" : "disconnected",
    dbName: connected ? mongoose.connection.name : null,
  });
});

// Serve user-uploaded files (profile + product images) directly from disk.
// The folder layout is `<UPLOAD_ROOT>/<UTC date>/<profile|product>/<uuid>.webp`
// and the public URLs stored in Mongo mirror that path 1:1.
app.use(
  PUBLIC_UPLOAD_PATH,
  express.static(UPLOAD_ROOT, {
    fallthrough: false,
    maxAge: "7d",
    immutable: true,
  })
);

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/upload", uploadRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/locations", locationRoutes);
app.use("/api/v1/listings", listingRoutes);
app.use("/api/v1/membership", membershipRoutes);
app.use("/api/v1/claims", claimRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/contact", contactRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

async function main() {
  try {
    await connectDatabase(MONGODB_URI);
    console.log(
      `MongoDB connected (database: ${mongoose.connection.name})`
    );
  } catch (err) {
    console.error("Failed to connect MongoDB:", err.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });
}

main();
