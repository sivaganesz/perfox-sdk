import type { ISODateTime, JsonObject } from "../../types/common.js";

export type McpTransport = "sse" | "http";
export type McpAuthType = "none" | "bearer" | "api_key" | "basic" | "oauth2";
export type McpOversizedResultPolicy = "offload" | "trim" | "pass_through";

/** A registered MCP tool server. The auth secret is never returned (only `has_credential`). */
export interface McpServer {
  id: string;
  name: string;
  description?: string;
  url: string;
  /** Plain string in responses (`sse` / `http` on input). */
  transport: string;
  /** Plain string in responses. */
  auth_type: string;
  auth_header_name?: string;
  has_credential: boolean;
  /** Discovered tool schemas. */
  tools: JsonObject[];
  health_status?: string;
  created_at?: ISODateTime;
  updated_at?: ISODateTime;
}

/** Limits for calls to an MCP server (all fields required on register). */
export interface McpServerConfig {
  /** Integer > 0. */
  rate_limit: number;
  /** Integer > 0. */
  timeout_ms: number;
  /** Integer ≥ 0. */
  cache_ttl_s: number;
}

/** Body of `POST /mcp-servers`. */
export interface McpServerRegisterParams {
  /** minLength 1. */
  name: string;
  description: string;
  /** format: uri. */
  url: string;
  transport: McpTransport;
  auth_type: McpAuthType;
  auth_header_name?: string;
  /** Stored but never returned by any read. */
  auth_secret?: string;
  credential_ref?: string;
  config: McpServerConfig;
  oversized_result_policy?: McpOversizedResultPolicy;
}

/**
 * Body of `PATCH /mcp-servers/{id}` — edits the server in place.
 * Omit or blank `auth_secret` to keep the current secret.
 */
export interface McpServerUpdateParams {
  /** minLength 1. */
  name?: string;
  description?: string;
  /** format: uri. */
  url?: string;
  transport?: McpTransport;
  auth_type?: McpAuthType;
  auth_header_name?: string;
  auth_secret?: string;
  config?: Partial<McpServerConfig>;
  oversized_result_policy?: McpOversizedResultPolicy;
}

/** Response of `GET /mcp-servers`. */
export interface McpServerListResponse {
  data: McpServer[];
}
