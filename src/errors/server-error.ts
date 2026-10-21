import { APIError } from "./api-error.js";

/** 5xx — the server failed to process a valid request. */
export class InternalServerError extends APIError {}
