import type { APIResource } from "../core/resource.js";
import { Agents } from "../resources/agents/agents.js";
import { Analytics } from "../resources/analytics/analytics.js";
import { Billing } from "../resources/billing/billing.js";
import { Calls } from "../resources/calls/calls.js";
import { Conversations } from "../resources/conversations/conversations.js";
import { Credentials } from "../resources/credentials/credentials.js";
import { Customers } from "../resources/customers/customers.js";
import { KnowledgeBase } from "../resources/knowledge-base/knowledge-base.js";
import { McpServers } from "../resources/mcp-servers/mcp-servers.js";
import { Messages } from "../resources/messages/messages.js";
import { Outbound } from "../resources/outbound/outbound.js";
import { resolveConfig, type ClientOptions } from "./config.js";
import { HttpClient } from "./http-client.js";
import type { ApiRequest, RequestOptions } from "./request.js";
import type { ApiResponse } from "./response.js";

/**
 * Client for the Perfox Platform API.
 *
 * @example
 * ```ts
 * import { PerfoxClient } from "perfox-sdk";
 *
 * const perfox = new PerfoxClient({
 *   apiKey: process.env.PERFOX_API_KEY,
 *   workspace: "acme",
 * });
 *
 * const customer = await perfox.customers.get("cus_123");
 * ```
 */
export class PerfoxClient {
  readonly customers: Customers;
  readonly conversations: Conversations;
  readonly knowledgeBase: KnowledgeBase;
  readonly credentials: Credentials;
  readonly mcpServers: McpServers;
  readonly analytics: Analytics;
  readonly calls: Calls;
  readonly billing: Billing;
  readonly outbound: Outbound;
  readonly messages: Messages;
  readonly agents: Agents;

  readonly #http: HttpClient;

  constructor(options: ClientOptions = {}) {
    this.#http = new HttpClient(resolveConfig(options));

    this.customers = new Customers(this.#http);
    this.conversations = new Conversations(this.#http);
    this.knowledgeBase = new KnowledgeBase(this.#http);
    this.credentials = new Credentials(this.#http);
    this.mcpServers = new McpServers(this.#http);
    this.analytics = new Analytics(this.#http);
    this.calls = new Calls(this.#http);
    this.billing = new Billing(this.#http);
    this.outbound = new Outbound(this.#http);
    this.messages = new Messages(this.#http);
    this.agents = new Agents(this.#http);
  }

  /** The resolved API base URL, e.g. `https://acme-api.perfox.ai/api/v1`. */
  get baseUrl(): string {
    return this.#http.baseUrl;
  }

  /**
   * Low-level request with the client's auth, retries and error handling,
   * returning the body with status and headers. Prefer the typed resource methods.
   */
  request<T = unknown>(request: ApiRequest, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.#http.request<T>(request, options);
  }

  /**
   * Instantiates a custom resource class bound to this client's transport —
   * the extension point for API categories not built into the SDK.
   */
  resource<R extends APIResource>(Resource: new (http: HttpClient) => R): R {
    return new Resource(this.#http);
  }
}
