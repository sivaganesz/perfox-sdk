import { InvalidRequestError } from "../errors/sdk-error.js";

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export interface ClientOptions {
  /**
   * Tenant API key (`sk_…`), generated in Studio → Settings → API Keys.
   * Defaults to the `PERFOX_API_KEY` environment variable.
   *
   * This is a server-to-server API: never ship the key to a browser.
   */
  apiKey?: string;
  /**
   * Workspace slug. The SDK calls `https://{workspace}-api.perfox.ai/api/v1`.
   * Defaults to the `PERFOX_WORKSPACE` environment variable.
   * Ignored when `baseUrl` is set.
   */
  workspace?: string;
  /**
   * Full API base URL including the `/api/v1` prefix, e.g. for a proxy.
   * Defaults to the `PERFOX_BASE_URL` environment variable.
   */
  baseUrl?: string;
  /** Per-attempt timeout in milliseconds. Default: 60 000. */
  timeoutMs?: number;
  /**
   * Retries for operations that are safe to repeat (reads, deletes, documented
   * idempotent writes). Non-idempotent writes are never retried automatically.
   * Default: 2.
   */
  maxRetries?: number;
  /** Extra headers sent on every request. */
  defaultHeaders?: Record<string, string>;
  /** Custom `fetch` implementation. Defaults to the global `fetch`. */
  fetch?: FetchLike;
}

export interface ResolvedConfig {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
  maxRetries: number;
  defaultHeaders: Record<string, string>;
  fetch: FetchLike;
}

export const DEFAULT_TIMEOUT_MS = 60_000;
export const DEFAULT_MAX_RETRIES = 2;

const WORKSPACE_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/;

/** Builds the documented server URL for a workspace slug. */
export function workspaceBaseUrl(workspace: string): string {
  if (!WORKSPACE_PATTERN.test(workspace)) {
    throw new InvalidRequestError(
      `Invalid workspace slug ${JSON.stringify(workspace)}: expected letters, digits and hyphens.`,
    );
  }
  return `https://${workspace}-api.perfox.ai/api/v1`;
}

export function resolveConfig(options: ClientOptions = {}): ResolvedConfig {
  const apiKey = options.apiKey ?? readEnv("PERFOX_API_KEY");
  if (!apiKey || apiKey.trim() === "") {
    throw new InvalidRequestError(
      "Missing API key: pass `apiKey` to the client or set the PERFOX_API_KEY environment variable.",
    );
  }

  const baseUrl = resolveBaseUrl(options);

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new InvalidRequestError("`timeoutMs` must be a positive number.");
  }
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  assertRetries(maxRetries);

  if (typeof (options.fetch ?? globalThis.fetch) !== "function") {
    throw new InvalidRequestError(
      "No global `fetch` found. Use Node.js 18+ or pass a `fetch` implementation in the client options.",
    );
  }

  return {
    apiKey: apiKey.trim(),
    baseUrl,
    timeoutMs,
    maxRetries,
    defaultHeaders: { ...options.defaultHeaders },
    // Late-bound so a global fetch patched after construction (tests, polyfills) is used.
    fetch: options.fetch ?? ((input, init) => globalThis.fetch(input, init)),
  };
}

export function assertRetries(value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new InvalidRequestError("`maxRetries` must be a non-negative integer.");
  }
}

function resolveBaseUrl(options: ClientOptions): string {
  const explicit = options.baseUrl ?? (options.workspace ? undefined : readEnv("PERFOX_BASE_URL"));
  if (explicit) {
    let url: URL;
    try {
      url = new URL(explicit);
    } catch {
      throw new InvalidRequestError(`Invalid baseUrl ${JSON.stringify(explicit)}.`);
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new InvalidRequestError("`baseUrl` must use http or https.");
    }
    if (url.search || url.hash) {
      throw new InvalidRequestError("`baseUrl` must not contain a query string or fragment.");
    }
    return url.toString().replace(/\/+$/, "");
  }

  const workspace = options.workspace ?? readEnv("PERFOX_WORKSPACE");
  if (!workspace) {
    throw new InvalidRequestError(
      "Missing workspace: pass `workspace` (or `baseUrl`) to the client, or set PERFOX_WORKSPACE.",
    );
  }
  return workspaceBaseUrl(workspace.trim());
}

function readEnv(name: string): string | undefined {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  const value = env?.[name];
  return value === undefined || value.trim() === "" ? undefined : value;
}
