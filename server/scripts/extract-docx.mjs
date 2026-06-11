import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const docx = process.argv[2];
if (!docx) {
  console.error("Usage: node extract-docx.mjs <path-to-docx>");
  process.exit(1);
}

const tmp = path.join(path.dirname(fileURLToPath(import.meta.url)), "_docx_tmp");
fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(tmp, { recursive: true });

const zipPath = path.join(tmp, "doc.zip");
fs.copyFileSync(docx, zipPath);
execSync(
  `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${tmp.replace(/'/g, "''")}' -Force"`,
  { stdio: "inherit" }
);

const xml = fs.readFileSync(path.join(tmp, "word", "document.xml"), "utf8");
const paragraphs = xml
  .split(/<w:p[\s>]/)
  .slice(1)
  .map((p) => {
    const parts = [...p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]);
    return parts.join("").trim();
  })
  .filter(Boolean);

for (const line of paragraphs) {
  console.log(line);
}

fs.rmSync(tmp, { recursive: true, force: true });
