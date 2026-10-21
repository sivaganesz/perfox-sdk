import { APIError } from "./api-error.js";

/**
 * 409 — the request conflicts with existing state.
 * Documented codes include `identity_conflict` and `link_conflict` (customer links).
 */
export class ConflictError extends APIError {}
