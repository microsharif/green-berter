const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1";

/**
 * Origin portion of the API (no `/api/v1` suffix). Static assets the server
 * exposes (e.g. `/upload/...` images) live under this origin, NOT under the
 * versioned API prefix, so we expose it separately for `resolveMediaUrl`.
 */
export const API_ORIGIN = (() => {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return "";
  }
})();

/**
 * Typed error for API failures. Wraps non-2xx responses and network errors
 * so callers can branch on `code` / `status` / `fieldErrors`.
 */
export class ApiError extends Error {
  constructor(message, { status = 0, code = "REQUEST_FAILED", fieldErrors = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Thin fetch wrapper:
 *   - prefixes API_BASE_URL
 *   - JSON request + response by default
 *   - throws ApiError with backend `code` / `errors` on non-2xx
 *   - throws ApiError("NETWORK_ERROR") when fetch itself fails
 */
export async function apiFetch(path, { method = "GET", body, headers, ...rest } = {}) {
  const url = `${API_BASE_URL}${path}`;
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  let response;
  try {
    response = await fetch(url, {
      method,
      // The server issues an httpOnly session cookie; the browser must send
      // it cross-origin (Vite dev :5173 → API :3000).
      credentials: "include",
      headers: {
        Accept: "application/json",
        // For FormData bodies the browser sets the multipart Content-Type
        // (with the boundary) automatically — overriding it here would break
        // the upload.
        ...(body !== undefined && !isFormData
          ? { "Content-Type": "application/json" }
          : null),
        ...headers,
      },
      body:
        body === undefined
          ? undefined
          : isFormData
            ? body
            : JSON.stringify(body),
      ...rest,
    });
  } catch {
    throw new ApiError("Could not reach the server. Check your connection.", {
      code: "NETWORK_ERROR",
    });
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ApiError(payload?.message ?? `Request failed (${response.status}).`, {
      status: response.status,
      code: payload?.code ?? "REQUEST_FAILED",
      fieldErrors: payload?.errors ?? null,
    });
  }

  return payload;
}
