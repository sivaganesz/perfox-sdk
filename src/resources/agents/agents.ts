import { buildPath, type RequestOptions } from "../../client/request.js";
import { APIResource } from "../../core/resource.js";
import type {
  Agent,
  AgentBuildResult,
  AgentCreateFromSpecParams,
  AgentCreateParams,
  AgentGenerateParams,
  AgentListResponse,
  AgentPublishResponse,
  AgentUpdateParams,
} from "./types.js";

/** Agents API — agent workflows and their node/edge graphs. */
export class Agents extends APIResource {
  /**
   * Create an agent as a draft — `POST /agents` (scope `workflows:write`).
   * Send a full node/edge graph, or omit it and fill it in with {@link update}.
   * Publish separately with {@link publish}.
   */
  async create(params: AgentCreateParams, options?: RequestOptions): Promise<Agent> {
    return this._request({ method: "POST", path: "/agents", body: params, idempotent: false }, options);
  }

  /** List agents — `GET /agents` (scope `workflows:read`). */
  async list(options?: RequestOptions): Promise<AgentListResponse> {
    return this._request({ method: "GET", path: "/agents", idempotent: true }, options);
  }

  /** Get an agent with its graph — `GET /agents/{id}` (scope `workflows:read`). */
  async get(id: string, options?: RequestOptions): Promise<Agent> {
    return this._request({ method: "GET", path: buildPath("/agents/{id}", { id }), idempotent: true }, options);
  }

  /**
   * Update an agent — `PATCH /agents/{id}` (scope `workflows:write`).
   * Edit fields or replace the node/edge graph (attach tools/MCP/KB by including
   * their sub-nodes and typed edges).
   */
  async update(id: string, params: AgentUpdateParams, options?: RequestOptions): Promise<Agent> {
    return this._request(
      { method: "PATCH", path: buildPath("/agents/{id}", { id }), body: params, idempotent: false },
      options,
    );
  }

  /**
   * Publish an agent — `POST /agents/{id}/publish` (scope `workflows:publish`).
   *
   * Runs the publish gates, snapshots a version and takes the agent live. An
   * agent that is not publishable is refused with 422, thrown as
   * `ValidationError`; the node-tagged details are on `error.body`.
   * Not retried automatically: each publish creates a new version.
   */
  async publish(id: string, options?: RequestOptions): Promise<AgentPublishResponse> {
    return this._request(
      { method: "POST", path: buildPath("/agents/{id}/publish", { id }), idempotent: false },
      options,
    );
  }

  /**
   * Create an agent from a compact spec — `POST /agents/from-spec`
   * (scope `workflows:write`). Assembles the canonical graph (trigger +
   * ai_agent + persona + chat_model) for you. Optionally publishes.
   */
  async createFromSpec(params: AgentCreateFromSpecParams, options?: RequestOptions): Promise<AgentBuildResult> {
    return this._request({ method: "POST", path: "/agents/from-spec", body: params, idempotent: false }, options);
  }

  /**
   * Generate an agent from a plain-language description — `POST /agents/generate`
   * (scope `workflows:write`). The platform's System LLM drafts the persona and
   * system prompt, then builds the canonical graph. Requires a configured
   * System LLM. Optionally publishes.
   */
  async generate(params: AgentGenerateParams, options?: RequestOptions): Promise<AgentBuildResult> {
    return this._request({ method: "POST", path: "/agents/generate", body: params, idempotent: false }, options);
  }
}
