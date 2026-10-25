import { DEFAULT_TIMEOUT_MS, USER_AGENT } from "../config/constants.js";
import { RateLimitError, TimeoutError, UpstreamError } from "./errors.js";

interface FetchOptions extends RequestInit {
  timeoutMs?: number;
}

export async function fetchJson<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const headers = new Headers(options.headers || {});
  if (!headers.has("User-Agent")) {
    headers.set("User-Agent", USER_AGENT);
  }
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    });

    if (response.status === 429) {
      const retryAfterHeader = response.headers.get("retry-after");
      let retryAfterSeconds: number | undefined;
      if (retryAfterHeader) {
        const parsed = parseInt(retryAfterHeader, 10);
        if (!isNaN(parsed)) {
          retryAfterSeconds = parsed;
        }
      }
      throw new RateLimitError(`Rate limit exceeded for ${url}`, retryAfterSeconds);
    }

    if (!response.ok) {
      let errorBody: unknown;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = await response.text().catch(() => null);
      }
      throw new UpstreamError(
        `Upstream request to ${url} failed with status ${response.status}`,
        response.status,
        errorBody
      );
    }

    const json = (await response.json()) as T;
    return json;
  } catch (error) {
    if (error instanceof RateLimitError || error instanceof UpstreamError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new TimeoutError(`Request to ${url} timed out after ${timeoutMs}ms`);
    }

    throw new UpstreamError(
      `Network failure requesting ${url}: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
