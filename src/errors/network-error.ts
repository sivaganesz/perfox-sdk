import { PerfoxError } from "./sdk-error.js";

/** The request never produced an HTTP response (DNS, TLS, connection reset, ...). */
export class NetworkError extends PerfoxError {}

/** The request did not complete within the configured timeout. */
export class TimeoutError extends NetworkError {
  readonly timeoutMs: number;

  constructor(timeoutMs: number, options?: { cause?: unknown }) {
    super(`Request timed out after ${timeoutMs} ms`, options);
    this.timeoutMs = timeoutMs;
  }
}

/** The caller aborted the request through its `AbortSignal`. */
export class RequestAbortedError extends PerfoxError {
  constructor(options?: { cause?: unknown }) {
    super("Request was aborted", options);
  }
}
