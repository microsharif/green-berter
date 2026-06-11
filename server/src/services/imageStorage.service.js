import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  PUBLIC_UPLOAD_PATH,
  UPLOAD_ROOT,
  buildPublicUrl,
  buildStorageDir,
  getUtcDateFolder,
  isValidUploadKind,
} from "../config/upload.js";

const MAX_DIMENSION_PX = 1600;
const WEBP_QUALITY = 82;
const OUTPUT_EXTENSION = "webp";

/**
 * Persists the given image buffer underneath `UPLOAD_ROOT`:
 *   <UPLOAD_ROOT>/<UTC date>/<kind>/<uuid>.webp
 *
 * The file is always re-encoded to WebP by `sharp` (strips EXIF, normalises
 * orientation, clamps the long edge to MAX_DIMENSION_PX). The plaintext
 * filename uses a UUID — no userId, no original filename — so this service is
 * safe to call before the related user / listing row even exists.
 *
 * @returns {Promise<{url: string, absolutePath: string, fileName: string,
 *   bytes: number}>}
 */
export async function saveImage({ buffer, kind, now = new Date() }) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("saveImage: image buffer is empty");
  }
  if (!isValidUploadKind(kind)) {
    throw new Error(`saveImage: invalid kind "${kind}"`);
  }

  const dateFolder = getUtcDateFolder(now);
  const storageDir = buildStorageDir(kind, dateFolder);
  await mkdir(storageDir, { recursive: true });

  const fileName = `${randomUUID()}.${OUTPUT_EXTENSION}`;
  const absolutePath = path.join(storageDir, fileName);

  const processed = await sharp(buffer, { failOn: "none" })
    .rotate()
    .resize({
      width: MAX_DIMENSION_PX,
      height: MAX_DIMENSION_PX,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  await writeFile(absolutePath, processed);

  return {
    url: buildPublicUrl(kind, dateFolder, fileName),
    absolutePath,
    fileName,
    bytes: processed.length,
  };
}

/**
 * Best-effort deletion for a stored URL. Returns `true` when the file
 * existed and was removed, `false` otherwise (missing file, foreign URL,
 * traversal attempt). Used during user/profile updates and for cleanup when
 * registration fails after an upload succeeded.
 */
export async function deleteStoredImage(publicUrl) {
  if (typeof publicUrl !== "string" || !publicUrl.startsWith(`${PUBLIC_UPLOAD_PATH}/`)) {
    return false;
  }
  const relative = publicUrl.slice(PUBLIC_UPLOAD_PATH.length + 1);
  if (relative.includes("..")) return false;

  const absolutePath = path.resolve(UPLOAD_ROOT, relative);
  if (!absolutePath.startsWith(UPLOAD_ROOT)) return false;

  try {
    await unlink(absolutePath);
    return true;
  } catch (err) {
    if (err?.code === "ENOENT") return false;
    throw err;
  }
}
