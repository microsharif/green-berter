/**
 * Seeds users + listings from legacy Green Barter export.
 *
 * Data file: `importListings.data.json` (46 rows). Override path via CLI arg.
 * Run: `npm run seed:import-listings`
 */
import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { connectDatabase } from "../config/db.js";
import User from "../models/User.js";
import Listing from "../models/Listing.js";
import ListingCategory from "../models/ListingCategory.js";
import ListingLocation, { MAX_LOCATION_LEVEL } from "../models/ListingLocation.js";
import { isListingCategoryLeaf } from "../utils/categoryTree.js";
import { saveImage } from "../services/imageStorage.service.js";
import { UPLOAD_KINDS } from "../config/upload.js";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const IMPORT_DATA_PATH = path.join(__dirname, "importListings.data.json");
const CLASSIFIED_ROOT = path.join(
  REPO_ROOT,
  "client",
  "src",
  "components",
  "upload",
  "classified-listing"
);
const IMPORT_PASSWORD = "12345678";

function decodeHtml(value) {
  return String(value ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function parseCategoryTokens(raw) {
  if (!raw) return [];
  return decodeHtml(raw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !/^give$/i.test(s) && !/^exchange$/i.test(s));
}

function hasMeaningfulPrice(raw) {
  if (raw == null) return false;
  const s = String(raw).trim();
  if (!s) return false;
  if (/^0+([.,]0+)?$/.test(s)) return false;
  if (s.includes("-")) {
    const [a, b] = s.split("-").map((x) => Number(x.trim()));
    return Number.isFinite(a) && a > 0 && Number.isFinite(b) && b > 0;
  }
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) && n > 0;
}

function parseReferencePrice(raw) {
  if (!hasMeaningfulPrice(raw)) return null;
  const s = String(raw).trim();
  if (s.includes("-")) {
    const [a, b] = s.split("-").map((x) => Number(x.trim()));
    return Math.round((a + b) / 2);
  }
  return Number(s.replace(/,/g, ""));
}

function mapStatus(raw) {
  return String(raw ?? "").toLowerCase() === "pending" ? "pending" : "available";
}

function displayNameFromEmail(email) {
  const local = email.split("@")[0] ?? "member";
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .slice(0, 120);
}

function classifiedSuffixFromUrl(imageUrl) {
  if (!imageUrl) return null;
  const marker = "/classified-listing/";
  const idx = imageUrl.indexOf(marker);
  if (idx === -1) return null;
  return imageUrl.slice(idx + marker.length);
}

async function loadImageBuffer(row) {
  const suffix = classifiedSuffixFromUrl(row.image_url);
  if (suffix) {
    const localPath = path.join(CLASSIFIED_ROOT, suffix);
    try {
      return await fs.readFile(localPath);
    } catch {
      /* fall through to remote download */
    }
  }

  if (row.image_url) {
    const res = await fetch(row.image_url);
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 0) return buf;
    }
  }

  return sharp({
    create: {
      width: 800,
      height: 600,
      channels: 3,
      background: { r: 230, g: 236, b: 220 },
    },
  })
    .webp({ quality: 80 })
    .toBuffer();
}

async function buildCategoryPath(category) {
  if (!Array.isArray(category.ancestors) || category.ancestors.length === 0) {
    return category.name;
  }
  const ancestors = await ListingCategory.find({ _id: { $in: category.ancestors } })
    .select("_id name")
    .lean();
  const byId = new Map(ancestors.map((a) => [String(a._id), a.name]));
  const names = category.ancestors.map((id) => byId.get(String(id))).filter(Boolean);
  return [...names, category.name].join(" > ");
}

async function buildLocationPath(area, divisionName, cityName) {
  return [divisionName, cityName, area.name].filter(Boolean).join(" > ");
}

function buildLocationDisplay(areaName, cityName, divisionName) {
  return [areaName, cityName, divisionName].filter(Boolean).join(", ");
}

async function loadReferenceMaps() {
  const [categories, locations] = await Promise.all([
    ListingCategory.find({ isActive: true }).lean(),
    ListingLocation.find({ isActive: true }).lean(),
  ]);

  const childCategoryParents = new Set();
  for (const c of categories) {
    if (c.parentId) childCategoryParents.add(String(c.parentId));
  }
  const leafCategories = categories.filter(
    (c) => c.level > 0 && !childCategoryParents.has(String(c._id))
  );

  const categoriesByType = {
    give: leafCategories.filter((c) => c.listingType === "give"),
    exchange: leafCategories.filter((c) => c.listingType === "exchange"),
  };

  const categoryById = new Map(categories.map((c) => [String(c._id), c]));
  const locationsById = new Map(locations.map((l) => [String(l._id), l]));
  const areas = locations.filter((l) => l.level === MAX_LOCATION_LEVEL);

  return { categoriesByType, categoryById, locationsById, areas };
}

function scoreCategoryLeaf(leaf, tokens, categoryById) {
  const names = [leaf.name];
  for (const id of leaf.ancestors ?? []) {
    const anc = categoryById.get(String(id));
    if (anc?.name) names.push(anc.name);
  }
  let score = 0;
  for (const token of tokens) {
    if (names.some((n) => n.toLowerCase() === token.toLowerCase())) score += 2;
    else if (names.some((n) => n.toLowerCase().includes(token.toLowerCase()))) score += 1;
  }
  return score + leaf.level * 0.1;
}

function resolveCategory(tokens, listingType, categoriesByType, categoryById) {
  const pool = categoriesByType[listingType] ?? [];
  if (!pool.length) return null;

  if (!tokens.length) {
    return (
      pool.find((c) => c.name === "Others") ??
      pool.find((c) => c.slug?.endsWith("/others")) ??
      pool[0]
    );
  }

  let best = null;
  let bestScore = -1;
  for (const leaf of pool) {
    const score = scoreCategoryLeaf(leaf, tokens, categoryById);
    if (score > bestScore) {
      bestScore = score;
      best = leaf;
    }
  }
  return bestScore > 0 ? best : pool.find((c) => c.name === "Others") ?? pool[0];
}

function resolveArea(locationRaw, areas, locationsById) {
  if (!locationRaw) return null;
  const parts = decodeHtml(locationRaw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!parts.length) return null;

  const divisionPart = parts.find((p) => /division/i.test(p)) ?? null;
  const others = parts.filter((p) => p !== divisionPart);

  let best = null;
  let bestScore = -1;

  for (const area of areas) {
    const city = locationsById.get(String(area.ancestors?.[1] ?? ""));
    const division = locationsById.get(String(area.ancestors?.[0] ?? ""));
    if (!city || !division) continue;

    let score = 0;
    if (divisionPart && division.name.toLowerCase() === divisionPart.toLowerCase()) {
      score += 3;
    }
    for (const part of others) {
      if (area.name.toLowerCase() === part.toLowerCase()) score += 4;
      else if (city.name.toLowerCase() === part.toLowerCase()) score += 3;
      else if (division.name.toLowerCase() === part.toLowerCase()) score += 2;
    }
    if (score > bestScore) {
      bestScore = score;
      best = { area, city, division };
    }
  }

  return bestScore > 0 ? best : null;
}

async function ensureUsers(rows) {
  const emails = [...new Set(rows.map((r) => r.author_email?.trim().toLowerCase()).filter(Boolean))];
  const userByEmail = new Map();

  for (const email of emails) {
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        fullName: displayNameFromEmail(email),
        email,
        phone: "01700000000",
        address: "Dhaka, Bangladesh",
        membership: { plan: "sun", status: "active" },
      });
      user.password = IMPORT_PASSWORD;
      await user.save();
      console.log(`Created user: ${email}`);
    } else {
      if (user.membership?.plan === "free") {
        user.membership = { ...(user.membership?.toObject?.() ?? user.membership), plan: "sun", status: "active" };
        await user.save();
      }
      console.log(`Existing user: ${email}`);
    }
    userByEmail.set(email, user);
  }

  return userByEmail;
}

async function run() {
  const jsonPath = process.argv[2] || IMPORT_DATA_PATH;
  const raw = await fs.readFile(jsonPath, "utf8");
  const rows = JSON.parse(raw);
  if (!Array.isArray(rows)) throw new Error("Import file must be a JSON array");

  await connectDatabase(process.env.MONGODB_URI);
  console.log(`Connected to ${mongoose.connection.name}`);
  console.log(`Importing ${rows.length} listing(s) from ${jsonPath}\n`);

  const userByEmail = await ensureUsers(rows);
  const { categoriesByType, categoryById, locationsById, areas } = await loadReferenceMaps();

  const defaultExchangeInterested =
    categoriesByType.exchange.find((c) => c.slug === "exchange/others/others") ??
    categoriesByType.exchange.find((c) => c.name === "Others") ??
    categoriesByType.exchange[0];

  const defaultAreaMatch =
    resolveArea("Dhaka, Dhaka Division, Dhanmondi", areas, locationsById) ??
    (areas[0]
      ? {
          area: areas[0],
          city: locationsById.get(String(areas[0].ancestors?.[1] ?? "")),
          division: locationsById.get(String(areas[0].ancestors?.[0] ?? "")),
        }
      : null);

  if (!defaultAreaMatch?.area) {
    throw new Error("No listing locations in database. Run npm run seed:locations first.");
  }

  let created = 0;
  let skipped = 0;
  const failures = [];

  for (const row of rows) {
    const email = row.author_email?.trim().toLowerCase();
    const owner = userByEmail.get(email);
    if (!owner) {
      failures.push({ title: row.title, reason: "Missing author email" });
      continue;
    }

    const title = decodeHtml(row.title);
    const existing = await Listing.findOne({
      ownerUserId: owner._id,
      title,
    }).select("_id");
    if (existing) {
      skipped += 1;
      console.log(`= skip duplicate: ${title} (${email})`);
      continue;
    }

    const listingType = hasMeaningfulPrice(row.product_price) ? "exchange" : "give";
    const tokens = parseCategoryTokens(row.listing_categories);
    const category = resolveCategory(tokens, listingType, categoriesByType, categoryById);
    if (!category) {
      failures.push({ title: row.title, reason: "No matching category" });
      continue;
    }

    const locationMatch =
      resolveArea(row.listing_locations, areas, locationsById) ?? defaultAreaMatch;
    const { area, city, division } = locationMatch;

    try {
      const imageBuffer = await loadImageBuffer(row);
      const stored = await saveImage({ buffer: imageBuffer, kind: UPLOAD_KINDS.PRODUCT });
      const categoryPath = await buildCategoryPath(category);
      const locationPath = await buildLocationPath(area, division?.name, city?.name);
      const location = buildLocationDisplay(area.name, city?.name, division?.name);

      const exchange =
        listingType === "exchange"
          ? {
              referencePrice: parseReferencePrice(row.product_price),
              desiredItems: [await buildCategoryPath(defaultExchangeInterested)],
            }
          : {};

      const listing = new Listing({
        ownerUserId: owner._id,
        title,
        listingType,
        imageUrl: stored.url,
        gallery: [],
        categoryId: category._id,
        categoryName: category.name,
        categoryPath,
        areaId: area._id,
        divisionName: division?.name ?? null,
        cityName: city?.name ?? null,
        areaName: area.name,
        locationPath,
        location,
        pickupLatitude: area.latitude ?? 23.8103,
        pickupLongitude: area.longitude ?? 90.4125,
        story: row.title,
        tags: [],
        specs: {},
        exchange,
        status: mapStatus(row.status),
      });

      await listing.save();
      created += 1;
      console.log(`+ [${listingType}] ${row.title} (${email})`);
    } catch (err) {
      failures.push({ title: row.title, reason: err.message || String(err) });
    }
  }

  console.log(`\nDone. Created ${created}, skipped ${skipped} duplicate(s).`);
  if (failures.length) {
    console.log(`Failures (${failures.length}):`);
    for (const f of failures) {
      console.log(`  - ${f.title}: ${f.reason}`);
    }
  }

  await mongoose.connection.close();
}

run().catch(async (err) => {
  console.error("Import failed:", err.message || err);
  await mongoose.connection.close().catch(() => {});
  process.exitCode = 1;
});
