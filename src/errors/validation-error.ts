import { APIError } from "./api-error.js";

/**
 * 400 or 422 — the server rejected the request as invalid or unprocessable.
 * Documented codes include `sender_not_authorized` (POST /messages).
 */
export class ValidationError extends APIError {}
