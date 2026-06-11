import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "locationTree.data.json");
const DEFAULT_DOCX =
  process.env.LOCATION_DOCX ??
  "C:/Users/ASUS/Downloads/location_list.docx";

/** Approximate division centers (areas inherit city, city inherits division). */
const DIVISION_CENTERS = {
  Barishal: { lat: 22.701, lng: 90.3535 },
  Chattogram: { lat: 22.3569, lng: 91.7832 },
  Chittagong: { lat: 22.3569, lng: 91.7832 },
  Dhaka: { lat: 23.8103, lng: 90.4125 },
  Khulna: { lat: 22.8456, lng: 89.5403 },
  Mymensingh: { lat: 24.7471, lng: 90.4203 },
  Rajshahi: { lat: 24.3745, lng: 88.6042 },
  Rangpur: { lat: 25.7439, lng: 89.2752 },
  Sylhet: { lat: 24.8949, lng: 91.8687 },
};

function normalizeName(name) {
  return name
    .replace(/&apos;/g, "'")
    .replace(/\u2019/g, "'")
    .trim();
}

function coordsFor(divisionName, cityName, areaName, areaIndex) {
  const divKey = Object.keys(DIVISION_CENTERS).find(
    (k) => divisionName.toLowerCase().startsWith(k.toLowerCase())
  );
  const base = DIVISION_CENTERS[divKey] ?? { lat: 23.685, lng: 90.3563 };
  const jitter = ((areaIndex % 17) - 8) * 0.002;
  return {
    lat: Number((base.lat + jitter).toFixed(6)),
    lng: Number((base.lng + jitter * 1.1).toFixed(6)),
  };
}

function parseRawParts(parts) {
  const divisions = [];
  let current = null;

  for (const raw of parts) {
    const p = normalizeName(raw);
    if (!p) continue;

    if (p.endsWith(" Division")) {
      if (current) divisions.push(current);
      current = {
        division: p.replace(/ Division$/i, "").trim(),
        cities: {},
      };
      continue;
    }

    if (!current) continue;

    if (p.startsWith("-- ")) {
      const area = p.slice(3).trim();
      const cityKeys = Object.keys(current.cities);
      const city = cityKeys[cityKeys.length - 1];
      if (city && area) current.cities[city].push(area);
    } else if (p.startsWith("- ")) {
      const city = p.slice(2).trim();
      if (city) current.cities[city] = [];
    }
  }

  if (current) divisions.push(current);
  return divisions;
}

function toSeedTree(divisions) {
  const tree = {};

  for (const { division, cities } of divisions) {
    tree[division] = {};
    for (const [cityName, areaNames] of Object.entries(cities)) {
      tree[division][cityName] = {};
      const names =
        areaNames.length > 0 ? areaNames : [`${cityName} (general)`];
      names.forEach((areaName, idx) => {
        tree[division][cityName][areaName] = coordsFor(
          division,
          cityName,
          areaName,
          idx
        );
      });
    }
  }

  return tree;
}

function extractTextPartsFromDocx(docxPath) {
  const tmpZip = path.join(os.tmpdir(), `location_list_${Date.now()}.zip`);
  const tmpDir = path.join(os.tmpdir(), `location_docx_${Date.now()}`);
  fs.copyFileSync(docxPath, tmpZip);
  execSync(
    `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${tmpZip.replace(/'/g, "''")}' -DestinationPath '${tmpDir.replace(/'/g, "''")}' -Force"`,
    { stdio: "pipe" }
  );
  const xml = fs.readFileSync(path.join(tmpDir, "word", "document.xml"), "utf8");
  try {
    fs.unlinkSync(tmpZip);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    /* ignore cleanup errors */
  }
  const texts = [];
  const re = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  let m;
  while ((m = re.exec(xml)) !== null) texts.push(m[1]);
  return texts;
}

function main() {
  const docxPath = process.argv[2] ?? DEFAULT_DOCX;
  if (!fs.existsSync(docxPath)) {
    console.error(`Docx not found: ${docxPath}`);
    process.exit(1);
  }
  const parts = extractTextPartsFromDocx(docxPath)
    .map((s) => s.trim())
    .filter(Boolean);
  const divisions = parseRawParts(parts);
  const tree = toSeedTree(divisions);

  let cityCount = 0;
  let areaCount = 0;
  for (const cities of Object.values(tree)) {
    cityCount += Object.keys(cities).length;
    for (const areas of Object.values(cities)) {
      areaCount += Object.keys(areas).length;
    }
  }

  fs.writeFileSync(OUT_PATH, `${JSON.stringify(tree, null, 2)}\n`, "utf8");

  console.log(
    `Wrote ${OUT_PATH}: ${Object.keys(tree).length} divisions, ${cityCount} cities, ${areaCount} areas`
  );
}

main();
