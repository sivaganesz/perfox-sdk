// Client
export { PerfoxClient } from "./client/client.js";
export { PerfoxClient as PlatformClient } from "./client/client.js";
export {
  DEFAULT_MAX_RETRIES,
  DEFAULT_TIMEOUT_MS,
  workspaceBaseUrl,
  type ClientOptions,
  type FetchLike,
} from "./client/config.js";
export type { HttpClient } from "./client/http-client.js";
export {
  buildPath,
  type ApiRequest,
  type QueryParams,
  type QueryValue,
  type RequestOptions,
} from "./client/request.js";
export type { ApiResponse } from "./client/response.js";

// Core building blocks (also the extension points for new categories)
export { APIResource } from "./core/resource.js";
export { Paginator } from "./core/pagination.js";
export type { FileInput, FileToUpload, Uploadable } from "./core/uploads.js";

// Errors
export * from "./errors/index.js";

// Shared types
export type * from "./types/common.js";
export type * from "./types/pagination.js";
export type * from "./types/whatsapp.js";

// Resources
export * from "./resources/customers/index.js";
export * from "./resources/conversations/index.js";
export * from "./resources/knowledge-base/index.js";
export * from "./resources/credentials/index.js";
export * from "./resources/mcp-servers/index.js";
export * from "./resources/analytics/index.js";
export * from "./resources/calls/index.js";
export * from "./resources/billing/index.js";
export * from "./resources/outbound/index.js";
export * from "./resources/messages/index.js";
export * from "./resources/agents/index.js";

export { VERSION } from "./version.js";
