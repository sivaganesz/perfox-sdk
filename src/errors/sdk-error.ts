/**
 * Base class for every error thrown by the SDK.
 *
 * Catch this to handle any SDK failure; narrow with the subclasses
 * (`APIError`, `NetworkError`, ...) for specific handling.
 */
export class PerfoxError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}

/**
 * Thrown before any request is sent when the SDK is used incorrectly
 * (missing API key, empty resource id, unusable base URL, ...).
 */
export class InvalidRequestError extends PerfoxError {}
