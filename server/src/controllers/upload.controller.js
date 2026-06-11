import { UPLOAD_KINDS } from "../config/upload.js";
import { saveImage } from "../services/imageStorage.service.js";

/**
 * POST /api/v1/upload/profile-image
 *
 * Stores the uploaded image under `<date>/profile/<uuid>.webp` and returns
 * the public URL. The endpoint is intentionally **unauthenticated** so it
 * can be called from the registration page (the user does not have a
 * session yet at that point). Multer enforces the 5MB / single-file /
 * image-mime limits before this controller runs.
 */
export async function uploadProfileImage(req, res, next) {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({
        ok: false,
        code: "NO_FILE",
        message: "Attach an image file under the `image` field.",
      });
    }
    const result = await saveImage({
      buffer: req.file.buffer,
      kind: UPLOAD_KINDS.PROFILE,
    });
    return res.status(201).json({
      ok: true,
      url: result.url,
      bytes: result.bytes,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/upload/product-image
 *
 * Reserved for the upcoming listing-upload flow. Wired now so the storage
 * tree (and the cleanup story) only has to be designed once. Requires auth
 * because product listings are owner-scoped — see routes file for the
 * `requireAuth` middleware chain.
 */
export async function uploadProductImage(req, res, next) {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({
        ok: false,
        code: "NO_FILE",
        message: "Attach an image file under the `image` field.",
      });
    }
    const result = await saveImage({
      buffer: req.file.buffer,
      kind: UPLOAD_KINDS.PRODUCT,
    });
    return res.status(201).json({
      ok: true,
      url: result.url,
      bytes: result.bytes,
    });
  } catch (err) {
    return next(err);
  }
}
