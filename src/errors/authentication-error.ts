import { APIError } from "./api-error.js";

/** 401 — the API key is missing, malformed, revoked or unknown. */
export class AuthenticationError extends APIError {}
