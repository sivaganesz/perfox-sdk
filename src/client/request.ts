import { InvalidRequestError } from "../errors/sdk-error.js";
import type { HttpMethod } from "../types/common.js";

/** Per-call options accepted as the last argument of every SDK method. */
export interface RequestOptions {
  /** Abort the request (and any pending retry) with this signal. */
  signal?: AbortSignal;
  /** Override the client's per-attempt timeout for this call. */
  timeoutMs?: number;
  /**
   * Override the retry count for this call. Setting this on a non-idempotent
   * operation (e.g. sending a message) explicitly opts that call into retries,
   * which can cause duplicate side effects.
   */
  maxRetries?: number;
  /** Extra headers for this call (merged over the client's default headers). */
  headers?: Record<string, string>;
}

export type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue>;

/** Transport-level description of one API call, built by resource classes. */
export interface ApiRequest {
  method: HttpMethod;
  /** Path relative to the base URL, already encoded (use `buildPath`). */
  path: string;
  query?: QueryParams | undefined;
  /** JSON request body. Mutually exclusive with `form`. */
  body?: unknown;
  /** Multipart request body. Mutually exclusive with `body`. */
  form?: FormData;
  /**
   * Whether repeating the call cannot cause a duplicate side effect.
   * Only idempotent calls are retried automatically.
   */
  idempotent: boolean;
}

/**
 * Fills `{param}` placeholders in a documented path template, URL-encoding each
 * value and refusing empty ones (an empty id would silently hit a different endpoint).
 *
 * @example buildPath("/customers/{id}", { id: "cus_1" }) // "/customers/cus_1"
 */
export function buildPath(template: string, params: Record<string, string> = {}): string {
  return template.replace(/\{([^}]+)\}/g, (_, name: string) => {
    const value = params[name];
    if (typeof value !== "string" || value.trim() === "") {
      throw new InvalidRequestError(`Path parameter \`${name}\` must be a non-empty string.`);
    }
    return encodeURIComponent(value);
  });
}

/** Asserts that a required (non-path) parameter is a non-empty string and returns it. */
export function requireString(name: string, value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new InvalidRequestError(`\`${name}\` must be a non-empty string.`);
  }
  return value;
}

/** Serialises query params, dropping `undefined` and `null` values. */
export function buildQueryString(query: QueryParams | undefined): string {
  if (!query) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    search.append(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}
