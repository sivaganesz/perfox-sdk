import { APIError, type APIErrorInit } from "./api-error.js";

/**
 * 429 — too many requests.
 *
 * Rate limiting is not documented for this API; this class exists so a 429,
 * if one is ever returned, is surfaced distinctly and retried with backoff.
 */
export class RateLimitError extends APIError {
  /** Delay requested by a `Retry-After` header, in milliseconds, if one was sent. */
  readonly retryAfterMs: number | undefined;

  constructor(init: APIErrorInit) {
    super(init);
    this.retryAfterMs = parseRetryAfter(init.headers.get("retry-after"));
  }
}

/** Parses a `Retry-After` header (delta-seconds or HTTP-date) into milliseconds. */
export function parseRetryAfter(value: string | null, now: number = Date.now()): number | undefined {
  if (value === null || value.trim() === "") return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  if (Number.isNaN(date)) return undefined;
  return Math.max(0, date - now);
}
