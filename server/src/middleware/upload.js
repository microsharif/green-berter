import multer from "multer";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_UPLOAD_BYTES,
} from "../config/upload.js";

/**
 * Multer is configured with **in-memory** storage so that `sharp` can
 * re-encode the buffer to WebP (and strip EXIF / clamp dimensions) before we
 * touch the disk. The image storage service is the only place that writes
 * files into `UPLOAD_ROOT`.
 */
const storage = multer.memoryStorage();

function fileFilter(_req, file, cb) {
  if (ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
    return cb(null, true);
  }
  const err = new Error(
    "Unsupported image type. Use JPG, PNG, WebP, or GIF."
  );
  err.code = "UNSUPPORTED_MEDIA_TYPE";
  return cb(err);
}

/**
 * Returns multer middleware configured for a single `image` field on the
 * multipart body. Routes use this directly:
 *
 *   router.post("/profile-image", singleImage(), uploadProfileImage);
 */
export function singleImage(fieldName = "image") {
  return multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  }).single(fieldName);
}

/**
 * Translates multer's own errors (file too large, wrong type, no file
 * attached) into the JSON envelope the rest of the API uses. Mount it
 * **immediately after** the upload middleware so it can intercept errors
 * before the global error handler turns them into generic 500s.
 */
export function multerErrorHandler(err, _req, res, next) {
  if (!err) return next();

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        ok: false,
        code: "FILE_TOO_LARGE",
        message: `Image must be ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB or smaller.`,
      });
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE" || err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        ok: false,
        code: "UNEXPECTED_FILE",
        message: "Only one file is allowed per upload.",
      });
    }
    return res.status(400).json({
      ok: false,
      code: "UPLOAD_ERROR",
      message: err.message || "Upload failed.",
    });
  }

  if (err.code === "UNSUPPORTED_MEDIA_TYPE") {
    return res.status(415).json({
      ok: false,
      code: "UNSUPPORTED_MEDIA_TYPE",
      message: err.message,
    });
  }

  return next(err);
}
