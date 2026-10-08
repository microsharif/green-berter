import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inputPath = path.resolve(
  __dirname,
  "../public/images/green-barter-logo-Picsart-BackgroundRemover.png"
);
const outputPath = path.resolve(__dirname, "../public/images/green-barter-logo.png");

function isLogoPixel(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;

  if (max < 35) return false;

  if (max > 145) {
    return g > r + 18 && g > b + 14 && chroma > 14;
  }

  if (g >= 38 && g >= r - 8 && g >= b - 8 && chroma >= 6) return true;
  if (g > r + 5 && g > b + 4 && max > 42) return true;
  if (chroma >= 10 && max >= 55 && max <= 210 && g >= 38) return true;

  return false;
}

function isNeutralArtifact(r, g, b) {
  if (isLogoPixel(r, g, b)) return false;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;

  if (max < 55) return true;
  return chroma < 30 && max > 80;
}

function isBackgroundPixel(r, g, b, a) {
  if (a < 8) return true;
  if (r < 28 && g < 28 && b < 28) return true;
  return isNeutralArtifact(r, g, b);
}

function idx(x, y, width) {
  return y * width + x;
}

function touchesTransparent(pixels, width, height, channels, x, y) {
  for (const [nx, ny] of [
    [x - 1, y],
    [x + 1, y],
    [x, y - 1],
    [x, y + 1],
  ]) {
    if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
    if (pixels[idx(nx, ny, width) * channels + 3] === 0) return true;
  }
  return false;
}

function collectComponents(pixels, width, height, channels) {
  const visited = new Uint8Array(width * height);
  const components = [];

  function read(i) {
    const o = i * channels;
    return [pixels[o], pixels[o + 1], pixels[o + 2], pixels[o + 3]];
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const start = idx(x, y, width);
      if (visited[start]) continue;
      const [, , , a] = read(start);
      if (a === 0) continue;

      const queue = [[x, y]];
      const pixelsInComponent = [];
      visited[start] = 1;

      while (queue.length) {
        const [cx, cy] = queue.pop();
        const i = idx(cx, cy, width);
        pixelsInComponent.push(i);

        for (const [nx, ny] of [
          [cx - 1, cy],
          [cx + 1, cy],
          [cx, cy - 1],
          [cx, cy + 1],
        ]) {
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const ni = idx(nx, ny, width);
          if (visited[ni]) continue;
          if (read(ni)[3] === 0) continue;
          visited[ni] = 1;
          queue.push([nx, ny]);
        }
      }

      components.push(pixelsInComponent);
    }
  }

  return components;
}

async function processLogo() {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const pixels = Uint8Array.from(data);

  function read(i) {
    const o = i * channels;
    return [pixels[o], pixels[o + 1], pixels[o + 2], pixels[o + 3]];
  }

  function setTransparent(i) {
    pixels[i * channels + 3] = 0;
  }

  for (let i = 0; i < width * height; i += 1) {
    const [r, g, b, a] = read(i);
    if (isBackgroundPixel(r, g, b, a)) setTransparent(i);
  }

  for (let pass = 0; pass < 16; pass += 1) {
    let changed = 0;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const i = idx(x, y, width);
        const [r, g, b, a] = read(i);
        if (a === 0) continue;
        if (!touchesTransparent(pixels, width, height, channels, x, y)) continue;
        if (isNeutralArtifact(r, g, b)) {
          setTransparent(i);
          changed += 1;
        }
      }
    }
    if (changed === 0) break;
  }

  const components = collectComponents(pixels, width, height, channels);

  for (const component of components) {
    let logoCount = 0;
    let neutralCount = 0;

    for (const i of component) {
      const [r, g, b] = read(i);
      if (isLogoPixel(r, g, b)) logoCount += 1;
      else if (isNeutralArtifact(r, g, b)) neutralCount += 1;
    }

    const size = component.length;
    const logoRatio = logoCount / size;
    const neutralRatio = neutralCount / size;

    const isFloatingSmudge =
      size < 1200 && neutralRatio > 0.45 && logoRatio < 0.55;
    const isTinySpeck = size < 48;

    if (isFloatingSmudge || isTinySpeck) {
      for (const i of component) setTransparent(i);
    }
  }

  // Final sweep — delete any leftover neutral pixels.
  for (let i = 0; i < width * height; i += 1) {
    const [r, g, b, a] = read(i);
    if (a === 0) continue;
    if (isNeutralArtifact(r, g, b)) setTransparent(i);
  }

  const trimmed = await sharp(pixels, { raw: { width, height, channels } })
    .trim({ threshold: 1 })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(outputPath);

  const meta = await sharp(outputPath).metadata();
  const { data: outData } = await sharp(outputPath).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });

  let transparent = 0;
  let neutralLeft = 0;
  let opaque = 0;

  for (let i = 0; i < outData.length; i += 4) {
    if (outData[i + 3] === 0) {
      transparent += 1;
      continue;
    }
    opaque += 1;
    const r = outData[i];
    const g = outData[i + 1];
    const b = outData[i + 2];
    if (isNeutralArtifact(r, g, b)) neutralLeft += 1;
  }

  console.log(`Saved ${outputPath} (${meta.width}x${meta.height})`);
  console.log(`Transparent: ${transparent}, opaque: ${opaque}, neutral left: ${neutralLeft}`);
}

processLogo().catch((err) => {
  console.error(err);
  process.exit(1);
});
