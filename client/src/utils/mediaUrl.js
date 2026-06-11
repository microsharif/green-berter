import { API_ORIGIN } from "../api/client.js";

/**
 * Server-stored upload URLs are saved as **relative** paths (`/upload/...`)
 * so they survive an environment change. The browser, however, needs an
 * absolute URL: in dev the API origin (`:3000`) differs from the Vite
 * origin (`:5173`).
 *
 * Rules:
 *   - Empty / nullish → empty string (caller falls back to the default
 *     avatar).
 *   - Already absolute (`http://`, `https://`, `blob:`, `data:`) → returned
 *     unchanged.
 *   - Starts with `/upload/` → prefixed with the API origin.
 *   - Anything else → returned unchanged (likely a `/public` asset served
 *     by Vite).
 */
export function resolveMediaUrl(url) {
  if (typeof url !== "string" || url.length === 0) return "";
  if (/^(https?:|blob:|data:)/i.test(url)) return url;
  if (url.startsWith("/upload/")) {
    return API_ORIGIN ? `${API_ORIGIN}${url}` : url;
  }
  return url;
}
