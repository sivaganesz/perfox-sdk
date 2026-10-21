import { PerfoxError } from "./sdk-error.js";

/**
 * Error envelope returned by the API on failure.
 * Documented as `{ error: string; message?: string }` where `error` is a
 * stable snake_case code (e.g. `not_found`).
 */
export interface ApiErrorBody {
  error: string;
  message?: string;
}

export interface APIErrorInit {
  status: number;
  /** Parsed response body (the error envelope when the server sent one). */
  body: unknown;
  headers: Headers;
  method: string;
  /** Request path relative to the base URL, without the query string. */
  path: string;
}

/** The server responded with a non-2xx status. */
export class APIError extends PerfoxError {
  /** HTTP status code. */
  readonly status: number;
  /** The envelope's stable snake_case `error` code, when present. */
  readonly code: string | undefined;
  /** The envelope's human-readable `message`, when present. */
  readonly detail: string | undefined;
  /** Raw parsed response body. */
  readonly body: unknown;
  /** Response headers. */
  readonly headers: Headers;
  readonly method: string;
  readonly path: string;

  constructor(init: APIErrorInit) {
    const envelope = isApiErrorBody(init.body) ? init.body : undefined;
    super(formatMessage(init, envelope));
    this.status = init.status;
    this.code = envelope?.error;
    this.detail = envelope?.message;
    this.body = init.body;
    this.headers = init.headers;
    this.method = init.method;
    this.path = init.path;
  }
}

export function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== "object" || value === null) return false;
  const { error, message } = value as { error?: unknown; message?: unknown };
  return typeof error === "string" && (message === undefined || typeof message === "string");
}

function formatMessage(init: APIErrorInit, envelope: ApiErrorBody | undefined): string {
  const head = envelope ? `${init.status} ${envelope.error}` : `${init.status}`;
  const tail =
    envelope?.message ?? (typeof init.body === "string" && init.body ? truncate(init.body) : undefined);
  return `${head}${tail ? `: ${tail}` : ""} (${init.method} ${init.path})`;
}

function truncate(text: string, max = 300): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
