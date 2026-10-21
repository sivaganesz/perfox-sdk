import { APIError, type APIErrorInit } from "./api-error.js";
import { AuthenticationError } from "./authentication-error.js";
import { ConflictError } from "./conflict-error.js";
import { NotFoundError } from "./not-found-error.js";
import { PermissionDeniedError } from "./permission-denied-error.js";
import { RateLimitError } from "./rate-limit-error.js";
import { InternalServerError } from "./server-error.js";
import { ValidationError } from "./validation-error.js";

/** Maps an HTTP error response onto the most specific error class. */
export function createAPIError(init: APIErrorInit): APIError {
  switch (init.status) {
    case 400:
    case 422:
      return new ValidationError(init);
    case 401:
      return new AuthenticationError(init);
    case 403:
      return new PermissionDeniedError(init);
    case 404:
      return new NotFoundError(init);
    case 409:
      return new ConflictError(init);
    case 429:
      return new RateLimitError(init);
    default:
      return init.status >= 500 ? new InternalServerError(init) : new APIError(init);
  }
}
