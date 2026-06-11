import { useRef, useState } from "react";
import { useUploadDraft } from "../../context/UploadDraftContext.jsx";
import { uploadProductImage } from "../../api/uploads.js";
import { resolveMediaUrl } from "../../utils/mediaUrl.js";
import { ApiError } from "../../api/client.js";
import MaterialIcon from "../ui/MaterialIcon.jsx";

// Mirror the server limit so users learn before the request fires. Keep in
// sync with MAX_UPLOAD_BYTES in server/.env (defaults to 5 MiB).
const MAX_BYTES = 5 * 1024 * 1024;

export default function PhotoUploadDropzone() {
  const { draft, updateDraft } = useUploadDraft();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function applyFile(file) {
    setErrorMsg("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please choose an image file (PNG / JPG / WebP).");
      return;
    }
    if (file.size > MAX_BYTES) {
      setErrorMsg(`Image is too large. Max ${(MAX_BYTES / 1024 / 1024).toFixed(0)} MB.`);
      return;
    }

    setUploading(true);
    try {
      const { url } = await uploadProductImage(file);
      updateDraft({ imageUrl: url });
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Could not upload that photo. Try again.";
      setErrorMsg(msg);
    } finally {
      setUploading(false);
    }
  }

  // Always pass through resolveMediaUrl: the server returns a path-only URL
  // (e.g. /upload/2026-05-18/product/<uuid>.webp) which the dev origin (:5173)
  // needs prefixed with API origin (:3000) before <img> can fetch it.
  const previewSrc = draft.imageUrl ? resolveMediaUrl(draft.imageUrl) : "";

  return (
    <section className="bg-surface-container-low rounded-xl p-8 border-2 border-dashed border-outline-variant/30 flex flex-col items-center justify-center text-center">
      {previewSrc ? (
        <div className="w-full max-w-sm mx-auto space-y-4">
          <img
            src={previewSrc}
            alt="Product preview"
            className="w-full h-48 object-cover rounded-xl border border-outline-variant/30"
          />
          <div className="flex gap-3 justify-center flex-wrap">
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="px-5 py-2 bg-white border border-outline-variant rounded-full text-sm font-semibold hover:bg-zinc-50 disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Change photo"}
            </button>
            <button
              type="button"
              disabled={uploading}
              onClick={() => updateDraft({ imageUrl: "" })}
              className="px-5 py-2 text-sm font-semibold text-zinc-600 hover:text-zinc-900 disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
            <MaterialIcon name="add_a_photo" className="text-zinc-400 text-3xl" />
          </div>
          <h4 className="font-headline font-bold text-lg">Upload Photos</h4>
          <p className="text-zinc-500 text-sm max-w-xs mt-1">
            Add a clear main photo. Natural lighting works best for sustainable
            goods.
          </p>
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) applyFile(f);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="mt-6 px-6 py-2 bg-white border border-outline-variant rounded-full text-sm font-semibold hover:bg-zinc-50 transition-colors disabled:opacity-60"
      >
        {uploading
          ? "Uploading…"
          : previewSrc
            ? "Select different file"
            : "Select Files"}
      </button>

      {errorMsg ? (
        <p className="mt-4 text-sm text-red-600 max-w-md">{errorMsg}</p>
      ) : null}
    </section>
  );
}
