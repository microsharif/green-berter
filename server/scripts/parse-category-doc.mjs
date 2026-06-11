import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const docx =
  process.argv[2] ??
  "C:/Users/ASUS/Downloads/category_list.docx";

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractParagraphs(docxPath) {
  const tmp = path.join(path.dirname(fileURLToPath(import.meta.url)), "_docx_tmp");
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  const zipPath = path.join(tmp, "doc.zip");
  fs.copyFileSync(docxPath, zipPath);
  execSync(
    `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${tmp.replace(/'/g, "''")}' -Force"`,
    { stdio: "pipe" }
  );
  const xml = fs.readFileSync(path.join(tmp, "word", "document.xml"), "utf8");
  fs.rmSync(tmp, { recursive: true, force: true });
  return xml
    .split(/<w:p[\s>]/)
    .slice(1)
    .map((p) => {
      const parts = [...p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]);
      return decodeEntities(parts.join("").trim());
    })
    .filter(Boolean);
}

function parseTrees(lines) {
  const trees = { exchange: {}, give: {} };
  let currentRoot = null;
  let currentL1 = null;

  for (const line of lines) {
    if (line === "Exchange" || line === "Give") {
      currentRoot = line.toLowerCase();
      currentL1 = null;
      continue;
    }
    if (!currentRoot) continue;

    if (line.startsWith("-- ")) {
      const name = line.slice(3).trim();
      if (!currentL1) {
        throw new Error(`Subcategory without parent: ${name}`);
      }
      trees[currentRoot][currentL1].push(name);
      continue;
    }

    if (line.startsWith("- ")) {
      const name = line.slice(2).trim();
      currentL1 = name;
      trees[currentRoot][currentL1] = [];
      continue;
    }

    throw new Error(`Unexpected line: ${line}`);
  }

  for (const [root, l1Map] of Object.entries(trees)) {
    for (const [l1Name, l2Names] of Object.entries(l1Map)) {
      if (l2Names.length === 0) {
        l1Map[l1Name] = [l1Name];
      }
    }
  }

  return trees;
}

const lines = extractParagraphs(docx);
const trees = parseTrees(lines);

const outPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "src",
  "seed",
  "categoryTree.data.json"
);
fs.writeFileSync(outPath, JSON.stringify(trees, null, 2) + "\n");

let exchangeL1 = 0;
let exchangeL2 = 0;
let giveL1 = 0;
let giveL2 = 0;
for (const l2 of Object.values(trees.exchange)) {
  exchangeL1 += 1;
  exchangeL2 += l2.length;
}
for (const l2 of Object.values(trees.give)) {
  giveL1 += 1;
  giveL2 += l2.length;
}

console.log(`Wrote ${outPath}`);
console.log(
  `exchange: ${exchangeL1} L1, ${exchangeL2} leaves | give: ${giveL1} L1, ${giveL2} leaves`
);
