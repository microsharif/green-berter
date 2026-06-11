import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { connectDatabase } from "../config/db.js";
import ListingLocation, { MAX_LOCATION_LEVEL } from "../models/ListingLocation.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCATION_DATA_PATH = path.join(__dirname, "locationTree.data.json");

function loadLocationTree() {
  const raw = fs.readFileSync(LOCATION_DATA_PATH, "utf8");
  return JSON.parse(raw);
}

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

async function upsertLocation(payload) {
  let doc = await ListingLocation.findOne({ slug: payload.slug });
  if (doc) {
    doc.set({ ...payload, isActive: true });
  } else {
    doc = new ListingLocation({ ...payload, isActive: true });
  }
  return doc.save();
}

export async function seedListingLocations({ logger = console } = {}) {
  const tree = loadLocationTree();
  const summary = { divisions: 0, cities: 0, areas: 0 };
  const pad = 72;

  let divIndex = 0;
  for (const [divName, cities] of Object.entries(tree)) {
    const divSlug = toSlugSegment(divName);
    const divDoc = await upsertLocation({
      slug: divSlug,
      name: divName,
      parentId: null,
      level: 0,
      ancestors: [],
      sortOrder: divIndex,
    });
    summary.divisions += 1;
    divIndex += 1;
    logger?.log?.(`div  ${divSlug.padEnd(pad)} → ${divDoc._id}`);

    let cityIndex = 0;
    for (const [cityName, areas] of Object.entries(cities)) {
      const citySlug = `${divSlug}/${toSlugSegment(cityName)}`;
      const cityDoc = await upsertLocation({
        slug: citySlug,
        name: cityName,
        parentId: divDoc._id,
        level: 1,
        ancestors: [divDoc._id],
        sortOrder: cityIndex,
      });
      summary.cities += 1;
      cityIndex += 1;
      logger?.log?.(`  city ${citySlug.padEnd(pad)} → ${cityDoc._id}`);

      let areaIndex = 0;
      for (const [areaName, coords] of Object.entries(areas)) {
        const areaSlug = `${citySlug}/${toSlugSegment(areaName)}`;
        const areaDoc = await upsertLocation({
          slug: areaSlug,
          name: areaName,
          parentId: cityDoc._id,
          level: MAX_LOCATION_LEVEL,
          ancestors: [divDoc._id, cityDoc._id],
          latitude: coords.lat,
          longitude: coords.lng,
          sortOrder: areaIndex,
        });
        summary.areas += 1;
        areaIndex += 1;
        logger?.log?.(`    area ${areaSlug.padEnd(pad)} → ${areaDoc._id}`);
      }
    }
  }

  return summary;
}

async function runFromCli() {
  const uri = process.env.MONGODB_URI;
  await connectDatabase(uri);
  console.log(`Connected to ${mongoose.connection.name}\n`);
  try {
    const summary = await seedListingLocations();
    console.log(
      `\nSeed complete: ${summary.divisions} division(s), ${summary.cities} city/cities, ${summary.areas} area(s).`
    );
  } finally {
    await mongoose.connection.close();
  }
}

const invokedDirectly =
  import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` ||
  process.argv[1]?.endsWith("listingLocations.js");

if (invokedDirectly) {
  runFromCli().catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
    mongoose.connection.close().catch(() => {});
  });
}
