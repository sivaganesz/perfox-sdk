import { buildPath, type RequestOptions } from "../../client/request.js";
import { APIResource } from "../../core/resource.js";
import type {
  McpServer,
  McpServerListResponse,
  McpServerRegisterParams,
  McpServerUpdateParams,
} from "./types.js";

/** MCP Servers API — tenant MCP tool servers that agents call out to. */
export class McpServers extends APIResource {
  /**
   * Register an MCP tool server — `POST /mcp-servers` (scope `mcp_servers:write`).
   * Tools are live-discovered. The auth credential is stored but never returned.
   */
  async register(params: McpServerRegisterParams, options?: RequestOptions): Promise<McpServer> {
    return this._request({ method: "POST", path: "/mcp-servers", body: params, idempotent: false }, options);
  }

  /** List MCP tool servers — `GET /mcp-servers` (scope `mcp_servers:read`). */
  async list(options?: RequestOptions): Promise<McpServerListResponse> {
    return this._request({ method: "GET", path: "/mcp-servers", idempotent: true }, options);
  }

  /**
   * Update an MCP tool server in place — `PATCH /mcp-servers/{id}` (scope `mcp_servers:write`).
   * The server id and stored credential id are preserved. Tools are re-discovered
   * only when the url or the auth actually changed.
   */
  async update(id: string, params: McpServerUpdateParams, options?: RequestOptions): Promise<McpServer> {
    return this._request(
      { method: "PATCH", path: buildPath("/mcp-servers/{id}", { id }), body: params, idempotent: false },
      options,
    );
  }

  /** Get an MCP tool server — `GET /mcp-servers/{id}` (scope `mcp_servers:read`). */
  async get(id: string, options?: RequestOptions): Promise<McpServer> {
    return this._request({ method: "GET", path: buildPath("/mcp-servers/{id}", { id }), idempotent: true }, options);
  }
}
