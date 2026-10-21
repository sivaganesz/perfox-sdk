import { buildPath, requireString, type RequestOptions } from "../../client/request.js";
import { Paginator } from "../../core/pagination.js";
import { APIResource } from "../../core/resource.js";
import type { Conversation } from "../conversations/types.js";
import type {
  Customer,
  CustomerConversationListParams,
  CustomerConversationListResponse,
  CustomerCreateParams,
  CustomerDetails,
  CustomerLink,
  CustomerLinkBatchParams,
  CustomerLinkBatchResponse,
  CustomerLinkDeleteResponse,
  CustomerLinkListResponse,
  CustomerLinkLookupParams,
  CustomerLinkParams,
  CustomerListResponse,
  CustomerUpdateParams,
} from "./types.js";

/** Customers API. */
export class Customers extends APIResource {
  /**
   * Create or update a customer — `POST /customers` (scope `customers:write`).
   *
   * Create-or-find by phone/email/external_id (E.164 normalised, deduped) and
   * apply identity fields. Idempotent on identity.
   */
  async create(params: CustomerCreateParams, options?: RequestOptions): Promise<Customer> {
    return this._request({ method: "POST", path: "/customers", body: params, idempotent: true }, options);
  }

  /** List customers — `GET /customers` (scope `customers:read`). */
  async list(options?: RequestOptions): Promise<CustomerListResponse> {
    return this._request({ method: "GET", path: "/customers", idempotent: true }, options);
  }

  /** Get a customer — `GET /customers/{id}` (scope `customers:read`). */
  async get(id: string, options?: RequestOptions): Promise<Customer> {
    return this._request({ method: "GET", path: buildPath("/customers/{id}", { id }), idempotent: true }, options);
  }

  /** Update a customer — `PATCH /customers/{id}` (scope `customers:write`). */
  async update(id: string, params: CustomerUpdateParams, options?: RequestOptions): Promise<Customer> {
    return this._request(
      { method: "PATCH", path: buildPath("/customers/{id}", { id }), body: params, idempotent: false },
      options,
    );
  }

  /**
   * A customer's details — quick stats and insights — `GET /customers/{id}/details`
   * (scope `customers:read`). Computed over ALL the customer's conversations.
   */
  async getDetails(id: string, options?: RequestOptions): Promise<CustomerDetails> {
    return this._request(
      { method: "GET", path: buildPath("/customers/{id}/details", { id }), idempotent: true },
      options,
    );
  }

  /**
   * One page of a customer's conversations, newest first —
   * `GET /customers/{id}/conversations` (scope `conversations:read`).
   * Pass the returned `next_cursor` as `cursor` for the next page.
   */
  async listConversations(
    id: string,
    params: CustomerConversationListParams = {},
    options?: RequestOptions,
  ): Promise<CustomerConversationListResponse> {
    return this._request(
      {
        method: "GET",
        path: buildPath("/customers/{id}/conversations", { id }),
        query: { status: params.status, limit: params.limit, cursor: params.cursor },
        idempotent: true,
      },
      options,
    );
  }

  /** Iterates every conversation of a customer across all pages. */
  iterateConversations(
    id: string,
    params: CustomerConversationListParams = {},
    options?: RequestOptions,
  ): Paginator<CustomerConversationListResponse, Conversation> {
    // Validate eagerly so misuse fails at the call site, not on first iteration.
    buildPath("/customers/{id}/conversations", { id });
    return new Paginator(
      (cursor) => this.listConversations(id, { ...params, cursor }, options),
      (page) => page.conversations,
      (page) => page.next_cursor,
      params.cursor,
    );
  }

  /**
   * Link an identifier combination to your external_id — `POST /customer/link`
   * (scope `customers:write`).
   *
   * Customers are never merged: conflicts are refused with 409
   * (`identity_conflict` / `link_conflict`, thrown as `ConflictError`).
   * Re-sending the identical link is idempotent.
   */
  async link(params: CustomerLinkParams, options?: RequestOptions): Promise<CustomerLink> {
    return this._request({ method: "POST", path: "/customer/link", body: params, idempotent: true }, options);
  }

  /** Read back the links to your external_id — `GET /customer/link` (scope `customers:read`). */
  async getLinks(params: CustomerLinkLookupParams, options?: RequestOptions): Promise<CustomerLinkListResponse> {
    return this._request(
      {
        method: "GET",
        path: "/customer/link",
        query: { external_id: requireString("external_id", params.external_id) },
        idempotent: true,
      },
      options,
    );
  }

  /**
   * Remove every link to your external_id — `DELETE /customer/link`
   * (scope `customers:write`). Also clears the external_id from customers these
   * links applied it to, if they still carry it.
   */
  async deleteLinks(params: CustomerLinkLookupParams, options?: RequestOptions): Promise<CustomerLinkDeleteResponse> {
    return this._request(
      {
        method: "DELETE",
        path: "/customer/link",
        query: { external_id: requireString("external_id", params.external_id) },
        idempotent: true,
      },
      options,
    );
  }

  /**
   * Link up to 500 identifier combinations in one call — `POST /customer/link/batch`
   * (scope `customers:write`). Each item is reported on its own; one conflict
   * never stops the others.
   */
  async linkBatch(params: CustomerLinkBatchParams, options?: RequestOptions): Promise<CustomerLinkBatchResponse> {
    return this._request(
      { method: "POST", path: "/customer/link/batch", body: params, idempotent: true },
      options,
    );
  }
}
