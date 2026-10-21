import { APIError } from "./api-error.js";

/** 404 — the resource does not exist in this tenant. */
export class NotFoundError extends APIError {}
