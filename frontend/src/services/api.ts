const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

/**
 * Builds the full API URL based on configured environment base URL.
 */
export const apiUrl = (path: string): string =>
  `${base}${path.startsWith("/") ? path : `/${path}`}`;

/**
 * Generic fetch wrapper with JSON validation, HTTP error status parsing,
 * and friendly error messages.
 */
export async function fetchJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(apiUrl(path), {
    signal,
    headers: { Accept: "application/json" },
  });

  let body: any;
  try {
    body = await response.json();
  } catch {
    throw new Error("The API did not return valid JSON. Verify backend is running.");
  }

  if (!response.ok) {
    const detail =
      typeof body.detail === "string"
        ? body.detail
        : Array.isArray(body.detail)
        ? body.detail.map((item: { msg: string }) => item.msg).join(" ")
        : `Request failed (${response.status}).`;

    const wait = response.headers.get("Retry-After");
    throw new Error(wait ? `${detail} Retry after ${wait} seconds.` : detail);
  }

  return body as T;
}
