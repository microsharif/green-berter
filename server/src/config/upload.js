import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.resolve(here, "..", "..");

/**
 * Kinds of images we know how to store. Each kind maps 1:1 to a folder name
 * underneath the daily date directory:
 *
 *   <UPLOAD_ROOT>/<YYYY-MM-DD>/profile/...
 *   <UPLOAD_ROOT>/<YYYY-MM-DD>/product/...
 *
 * Only PROFILE is wired through an HTTP route right now; PRODUCT is reserved
 * so the listing-upload flow can land in the same tree without re-thinking
 * paths later.
 */
export const UPLOAD_KINDS = Object.freeze({
  PROFILE: "profile",
  PRODUCT: "product",
});

const KIND_VALUES = new Set(Object.values(UPLOAD_KINDS));

export function isValidUploadKind(value) {
  return typeof value === "string" && KIND_VALUES.has(value);
}

/**
 * Absolute path to the directory that holds every uploaded file. Resolved
 * once at startup from `UPLOAD_DIR` (defaults to `./upload` relative to the
 * server package root).
 */
export const UPLOAD_ROOT = path.resolve(
  SERVER_ROOT,
  process.env.UPLOAD_DIR ?? "./upload"
);

/**
 * URL prefix used both by the static middleware (`app.use(PUBLIC_UPLOAD_PATH, ...)`)
 * and by the URLs we store in Mongo. Keeping these aligned lets us serve
 * `/upload/2026-05-18/profile/<uuid>.webp` directly from disk.
 */
export const PUBLIC_UPLOAD_PATH = process.env.PUBLIC_UPLOAD_PATH ?? "/upload";

export const MAX_UPLOAD_BYTES =
  Number(process.env.MAX_UPLOAD_BYTES) > 0
    ? Number(process.env.MAX_UPLOAD_BYTES)
    : 5 * 1024 * 1024;

export const ALLOWED_IMAGE_MIME_TYPES = Object.freeze([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/**
 * Date bucket the file should land in, in UTC. We pin UTC explicitly (rather
 * than relying on the host's local time) so files land in the same folder
 * regardless of which server instance handled the upload.
 */
export function getUtcDateFolder(date = new Date()) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Absolute on-disk directory for a given kind on a given date. Caller is
 * responsible for ensuring it exists (the storage service does so before
 * writing).
 */
export function buildStorageDir(kind, dateFolder = getUtcDateFolder()) {
  if (!isValidUploadKind(kind)) {
    throw new Error(`Unknown upload kind: ${kind}`);
  }
  return path.join(UPLOAD_ROOT, dateFolder, kind);
}

/**
 * Public URL we save in Mongo / return to clients. Uses forward slashes so
 * it is portable between Windows servers and POSIX clients.
 */
export function buildPublicUrl(kind, dateFolder, fileName) {
  return `${PUBLIC_UPLOAD_PATH}/${dateFolder}/${kind}/${fileName}`;
}

/**
 * Cheap shape check the auth controller uses to reject `profileImageUrl`
 * values that didn't come from our upload endpoint. We deliberately do NOT
 * verify the file exists on disk here — uploads happen on the same server
 * moments before register, and a missing file is a recoverable UI state.
 */
export function isOwnedUploadUrl(value, kind) {
  if (typeof value !== "string" || value.length === 0) return false;
  if (!isValidUploadKind(kind)) return false;
  const prefix = `${PUBLIC_UPLOAD_PATH}/`;
  if (!value.startsWith(prefix)) return false;
  const rest = value.slice(prefix.length);
  // Expect <date>/<kind>/<filename>
  const parts = rest.split("/");
  if (parts.length !== 3) return false;
  const [date, kindPart, fileName] = parts;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  if (kindPart !== kind) return false;
  if (!fileName || fileName.includes("..") || fileName.includes("\\")) {
    return false;
  }
  return true;
}
