import { APIError } from "./api-error.js";

/** 403 — the API key is valid but lacks the scope this operation requires. */
export class PermissionDeniedError extends APIError {}
