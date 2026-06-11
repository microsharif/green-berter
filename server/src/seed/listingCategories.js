import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { connectDatabase } from "../config/db.js";
import Listing from "../models/Listing.js";
import ListingCategory, {
  LISTING_TYPES,
  MAX_CATEGORY_LEVEL,
} from "../models/ListingCategory.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATEGORY_DATA_PATH = path.join(__dirname, "categoryTree.data.json");
const ZAKAT_RANGE_SLUG_PREFIX = "give/zakat/";

/**
 * Category tree sourced from category_list.docx (+ Zakat nested branch).
 *
 * Structure per listing type (give / exchange):
 *   level 0 = root (give | exchange)
 *   level 1 = category  (e.g. Art, Zakat)
 *   level 2 = subcategory leaf OR Zakat range (intermediate)
 *   level 3 = Zakat asset leaf only
 *
 * JSON values are either:
 *   - string[]  → flat L2 names (leaves at level 2)
 *   - object    → nested L2 → L3[] (Zakat price ranges → assets)
 */
function loadCategoryTrees() {
  const raw = fs.readFileSync(CATEGORY_DATA_PATH, "utf8");
  const parsed = JSON.parse(raw);
  const missing = LISTING_TYPES.filter((t) => !parsed[t]);
  if (missing.length) {
    throw new Error(`categoryTree.data.json missing roots: ${missing.join(", ")}`);
  }
  return parsed;
}

const ROOT_NAMES = {
  give: "Give",
  exchange: "Exchange",
};

function isNestedBranch(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Converts a display name into a single slug segment:
 *   "Bags & Wallets"  →  "bags-and-wallets"
 *   "Men's"           →  "mens"
 */
function toSlugSegment(name) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[''`]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function upsertCategory(payload) {
  let doc = await ListingCategory.findOne({ slug: payload.slug });
  if (doc) {
    doc.set({ ...payload, isActive: true });
  } else {
    doc = new ListingCategory({ ...payload, isActive: true });
  }
  return doc.save();
}

async function upsertZakatAssetLeaf({
  parentDoc,
  leafName,
  listingType,
  sortOrder,
  logger,
  pad,
  summary,
}) {
  const leafSlug = `${parentDoc.slug}/${toSlugSegment(leafName)}`;
  const leafDoc = await upsertCategory({
    slug: leafSlug,
    name: leafName,
    parentId: parentDoc._id,
    level: MAX_CATEGORY_LEVEL,
    ancestors: [...parentDoc.ancestors, parentDoc._id],
    listingType,
    sortOrder,
  });
  summary.leaves += 1;
  logger?.log?.(`      L3 ${leafSlug.padEnd(pad)} → ${leafDoc._id}`);
  return leafDoc;
}

async function upsertFlatL2Leaf({
  rootDoc,
  l1Doc,
  l2Name,
  listingType,
  sortOrder,
  logger,
  pad,
  summary,
}) {
  const l2Slug = `${l1Doc.slug}/${toSlugSegment(l2Name)}`;
  const l2Doc = await upsertCategory({
    slug: l2Slug,
    name: l2Name,
    parentId: l1Doc._id,
    level: 2,
    ancestors: [rootDoc._id, l1Doc._id],
    listingType,
    sortOrder,
  });
  summary.l2 += 1;
  summary.leaves += 1;
  logger?.log?.(`    L2 ${l2Slug.padEnd(pad)} → ${l2Doc._id}`);
  return l2Doc;
}

async function upsertZakatRangeBranch({
  rootDoc,
  l1Doc,
  l2Name,
  l3Names,
  listingType,
  sortOrder,
  logger,
  pad,
  summary,
}) {
  const l2Slug = `${l1Doc.slug}/${toSlugSegment(l2Name)}`;
  const l2Doc = await upsertCategory({
    slug: l2Slug,
    name: l2Name,
    parentId: l1Doc._id,
    level: 2,
    ancestors: [rootDoc._id, l1Doc._id],
    listingType,
    sortOrder,
  });
  summary.l2 += 1;
  logger?.log?.(`    L2 ${l2Slug.padEnd(pad)} → ${l2Doc._id}`);

  let l3Index = 0;
  for (const l3Name of l3Names) {
    await upsertZakatAssetLeaf({
      parentDoc: l2Doc,
      leafName: l3Name,
      listingType,
      sortOrder: l3Index,
      logger,
      pad,
      summary,
    });
    l3Index += 1;
  }
}

async function buildCategoryPath(category) {
  if (!Array.isArray(category.ancestors) || category.ancestors.length === 0) {
    return category.name;
  }
  const ancestors = await ListingCategory.find({
    _id: { $in: category.ancestors },
  })
    .select("_id name")
    .lean();
  const byId = new Map(ancestors.map((a) => [String(a._id), a.name]));
  const names = category.ancestors
    .map((id) => byId.get(String(id)))
    .filter(Boolean);
  return [...names, category.name].join(" > ");
}

/**
 * Deactivates legacy self-named L3 nodes (from an earlier seed) and moves
 * any listings that pointed at them back to the level-2 parent.
 */
async function cleanupOrphanL3Categories({ logger = console } = {}) {
  const orphanCandidates = await ListingCategory.find({
    level: MAX_CATEGORY_LEVEL,
    isActive: true,
  });

  let deactivated = 0;
  let migrated = 0;

  for (const l3 of orphanCandidates) {
    const parent = await ListingCategory.findById(l3.parentId);
    if (!parent?.isActive) {
      l3.isActive = false;
      await l3.save();
      deactivated += 1;
      continue;
    }

    if (parent.slug.startsWith(ZAKAT_RANGE_SLUG_PREFIX)) continue;

    const listings = await Listing.find({ categoryId: l3._id }).select(
      "categoryId categoryName categoryPath"
    );
    for (const listing of listings) {
      listing.categoryId = parent._id;
      listing.categoryName = parent.name;
      listing.categoryPath = await buildCategoryPath(parent);
      await listing.save();
      migrated += 1;
    }

    l3.isActive = false;
    await l3.save();
    deactivated += 1;
  }

  if (deactivated > 0 || migrated > 0) {
    logger?.log?.(
      `Deactivated ${deactivated} orphan L3 categor(ies); migrated ${migrated} listing(s) to L2.`
    );
  }

  return { deactivated, migrated };
}

export async function seedListingCategories({ logger = console } = {}) {
  const categoryTrees = loadCategoryTrees();
  const summary = { roots: 0, l1: 0, l2: 0, leaves: 0 };
  const pad = 72;

  for (const listingType of LISTING_TYPES) {
    const categoryTree = categoryTrees[listingType];
    const rootSlug = listingType;
    const rootDoc = await upsertCategory({
      slug: rootSlug,
      name: ROOT_NAMES[listingType],
      parentId: null,
      level: 0,
      ancestors: [],
      listingType,
      sortOrder: 0,
    });
    summary.roots += 1;
    logger?.log?.(`root  ${rootSlug.padEnd(pad)} → ${rootDoc._id}`);

    let l1Index = 0;
    for (const [l1Name, l1Value] of Object.entries(categoryTree)) {
      const l1Slug = `${rootSlug}/${toSlugSegment(l1Name)}`;
      const l1Doc = await upsertCategory({
        slug: l1Slug,
        name: l1Name,
        parentId: rootDoc._id,
        level: 1,
        ancestors: [rootDoc._id],
        listingType,
        sortOrder: l1Index,
      });
      summary.l1 += 1;
      l1Index += 1;
      logger?.log?.(`  L1  ${l1Slug.padEnd(pad)} → ${l1Doc._id}`);

      if (isNestedBranch(l1Value)) {
        let l2Index = 0;
        for (const [l2Name, l3Names] of Object.entries(l1Value)) {
          await upsertZakatRangeBranch({
            rootDoc,
            l1Doc,
            l2Name,
            l3Names,
            listingType,
            sortOrder: l2Index,
            logger,
            pad,
            summary,
          });
          l2Index += 1;
        }
      } else {
        let l2Index = 0;
        for (const l2Name of l1Value) {
          await upsertFlatL2Leaf({
            rootDoc,
            l1Doc,
            l2Name,
            listingType,
            sortOrder: l2Index,
            logger,
            pad,
            summary,
          });
          l2Index += 1;
        }
      }
    }
  }

  const cleanup = await cleanupOrphanL3Categories({ logger });
  return { ...summary, ...cleanup };
}

async function runFromCli() {
  const uri = process.env.MONGODB_URI;
  await connectDatabase(uri);
  console.log(`Connected to ${mongoose.connection.name}\n`);
  try {
    const summary = await seedListingCategories();
    console.log(
      `\nSeed complete: ${summary.roots} root(s), ${summary.l1} L1, ${summary.l2} L2, ${summary.leaves} leaf(s).`
    );
  } finally {
    await mongoose.connection.close();
  }
}

const invokedDirectly =
  import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` ||
  process.argv[1]?.endsWith("listingCategories.js");

if (invokedDirectly) {
  runFromCli().catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
    mongoose.connection.close().catch(() => {});
  });
}
