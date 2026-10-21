/**
 * An ISO-8601 timestamp string (`format: date-time` in the API spec).
 * Kept as a string — the SDK never converts wire values.
 */
export type ISODateTime = string;

/**
 * A string field whose known values are listed only in the API documentation's
 * prose (not as a schema enum). Known values get autocomplete; any other string
 * the server may send later is still accepted.
 */
export type OpenEnum<Known extends string> = Known | (string & {});

/** An arbitrary JSON object (schema `additionalProperties: {}`). */
export type JsonObject = Record<string, unknown>;

/** `{ success: true }` acknowledgement returned by several delete/move operations. */
export interface SuccessResponse {
  success: true;
}

/** HTTP methods used by the API. */
export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";
