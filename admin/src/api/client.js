const API_BASE_URL =
  import.meta.env.VITE_ADMIN_API_URL ?? "http://localhost:3000/api/v1";

/**
 * Origin portion of the API (no `/api/v1` suffix). Used to resolve relative
 * `/upload/...` media URLs the API returns.
 */
export const API_ORIGIN = (() => {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return "";
  }
})();

/** Typed error wrapping non-2xx responses + network failures. */
export class ApiError extends Error {
  constructor(
    message,
    { status = 0, code = "REQUEST_FAILED", fieldErrors = null } = {}
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Thin fetch wrapper for the admin API. Sends the httpOnly admin session
 * cookie cross-origin via `credentials: "include"`, JSON in/out, and throws
 * an `ApiError` carrying the backend `code` / field errors on failure.
 */
export async function apiFetch(
  path,
  { method = "GET", body, headers, ...rest } = {}
) {
  const url = `${API_BASE_URL}${path}`;

  let response;
  try {
    response = await fetch(url, {
      method,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : null),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
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
    throw new ApiError(
      payload?.message ?? `Request failed (${response.status}).`,
      {
        status: response.status,
        code: payload?.code ?? "REQUEST_FAILED",
        fieldErrors: payload?.errors ?? null,
      }
    );
  }

  return payload;
}

/** Build a query string from a params object, skipping empty values. */
export function buildQuery(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const str = search.toString();
  return str ? `?${str}` : "";
}
