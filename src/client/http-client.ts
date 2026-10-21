import { createAPIError } from "../errors/create-api-error.js";
import { NetworkError, RequestAbortedError, TimeoutError } from "../errors/network-error.js";
import { parseRetryAfter } from "../errors/rate-limit-error.js";
import { InvalidRequestError, PerfoxError } from "../errors/sdk-error.js";
import { VERSION } from "../version.js";
import { assertRetries, type ResolvedConfig } from "./config.js";
import { buildQueryString, type ApiRequest, type RequestOptions } from "./request.js";
import { readBody, type ApiResponse } from "./response.js";

/** Statuses worth retrying for an idempotent request. */
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

const INITIAL_RETRY_DELAY_MS = 500;
const MAX_BACKOFF_DELAY_MS = 8_000;
/** Upper bound on a server-requested `Retry-After` wait. */
const MAX_RETRY_AFTER_MS = 60_000;

interface AttemptResult {
  response: Response;
  parsed: unknown;
  isJson: boolean;
}

/**
 * Low-level transport shared by every resource. Handles auth, JSON/multipart
 * encoding, timeouts, cancellation, retries and error mapping.
 */
export class HttpClient {
  // ECMAScript-private so the API key never shows up in JSON.stringify / console.log.
  readonly #config: ResolvedConfig;

  constructor(config: ResolvedConfig) {
    this.#config = config;
  }

  get baseUrl(): string {
    return this.#config.baseUrl;
  }

  async request<T>(req: ApiRequest, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const maxRetries = options.maxRetries ?? (req.idempotent ? this.#config.maxRetries : 0);
    assertRetries(maxRetries);
    const timeoutMs = options.timeoutMs ?? this.#config.timeoutMs;
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      throw new InvalidRequestError("`timeoutMs` must be a positive number.");
    }
    if (req.body !== undefined && req.form !== undefined) {
      throw new InvalidRequestError("A request cannot have both a JSON body and a multipart form.");
    }

    const url = `${this.#config.baseUrl}${req.path}${buildQueryString(req.query)}`;

    for (let attempt = 0; ; attempt++) {
      if (options.signal?.aborted) throw new RequestAbortedError({ cause: options.signal.reason });

      let result: AttemptResult;
      try {
        result = await this.attempt(url, req, options, timeoutMs);
      } catch (error) {
        if (error instanceof NetworkError && attempt < maxRetries) {
          await sleep(backoffDelay(attempt), options.signal);
          continue;
        }
        throw error;
      }

      const { response, parsed, isJson } = result;
      if (response.ok) {
        if (parsed !== undefined && !isJson) {
          throw new PerfoxError(
            `Expected a JSON response from ${req.method} ${req.path} but received non-JSON content (status ${response.status}).`,
          );
        }
        return { data: parsed as T, status: response.status, headers: response.headers };
      }

      const error = createAPIError({
        status: response.status,
        body: parsed,
        headers: response.headers,
        method: req.method,
        path: req.path,
      });
      if (attempt < maxRetries && RETRYABLE_STATUSES.has(response.status)) {
        await sleep(retryDelay(response.headers, attempt), options.signal);
        continue;
      }
      throw error;
    }
  }

  /** One HTTP attempt. The timeout covers both the request and reading the body. */
  private async attempt(
    url: string,
    req: ApiRequest,
    options: RequestOptions,
    timeoutMs: number,
  ): Promise<AttemptResult> {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const onCallerAbort = () => controller.abort();
    options.signal?.addEventListener("abort", onCallerAbort, { once: true });

    try {
      const response = await this.#config.fetch(url, {
        method: req.method,
        headers: this.buildHeaders(req, options),
        body: req.form ?? (req.body === undefined ? undefined : JSON.stringify(req.body)),
        signal: controller.signal,
      });
      const { parsed, isJson } = await readBody(response);
      return { response, parsed, isJson };
    } catch (error) {
      if (options.signal?.aborted) throw new RequestAbortedError({ cause: error });
      if (timedOut) throw new TimeoutError(timeoutMs, { cause: error });
      throw new NetworkError(`Network error during ${req.method} ${req.path}: ${describe(error)}`, {
        cause: error,
      });
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", onCallerAbort);
    }
  }

  private buildHeaders(req: ApiRequest, options: RequestOptions): Headers {
    const headers = new Headers({ Accept: "application/json" });
    if (isServerRuntime()) headers.set("User-Agent", `perfox-sdk-typescript/${VERSION}`);
    // Multipart: let fetch set Content-Type with the boundary.
    if (req.body !== undefined) headers.set("Content-Type", "application/json");
    for (const [key, value] of Object.entries(this.#config.defaultHeaders)) headers.set(key, value);
    for (const [key, value] of Object.entries(options.headers ?? {})) headers.set(key, value);
    headers.set("Authorization", `Bearer ${this.#config.apiKey}`);
    return headers;
  }
}

function backoffDelay(attempt: number): number {
  const base = Math.min(MAX_BACKOFF_DELAY_MS, INITIAL_RETRY_DELAY_MS * 2 ** attempt);
  // Jitter in [75%, 100%] of the base delay to spread out concurrent retries.
  return base * (0.75 + Math.random() * 0.25);
}

function retryDelay(headers: Headers, attempt: number): number {
  const requested = parseRetryAfter(headers.get("retry-after"));
  return requested === undefined ? backoffDelay(attempt) : Math.min(requested, MAX_RETRY_AFTER_MS);
}

function sleep(ms: number, signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new RequestAbortedError({ cause: signal.reason }));
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(new RequestAbortedError({ cause: signal?.reason }));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function isServerRuntime(): boolean {
  return typeof (globalThis as { window?: unknown }).window === "undefined";
}

function describe(error: unknown): string {
  if (error instanceof Error) {
    const cause = (error as { cause?: unknown }).cause;
    return cause instanceof Error ? `${error.message} (${cause.message})` : error.message;
  }
  return String(error);
}
