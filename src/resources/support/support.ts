import { buildPath, type RequestOptions } from "../../client/request.js";
import { APIResource } from "../../core/resource.js";
import type {
  SupportTicket,
  SupportTicketCreateParams,
  SupportTicketListResponse,
  SupportTicketReplyParams,
  SupportTicketReplyResponse,
} from "./types.js";

/** Support API — tickets with the Skillmine support teams. */
export class Support extends APIResource {
  /**
   * Raise a support ticket — `POST /support/tickets` (scope `support:write`).
   * Not retried automatically: a repeat would file a duplicate ticket.
   */
  async createTicket(params: SupportTicketCreateParams, options?: RequestOptions): Promise<SupportTicket> {
    return this._request({ method: "POST", path: "/support/tickets", body: params, idempotent: false }, options);
  }

  /**
   * List your workspace's support tickets, newest activity first, however they
   * were raised — `GET /support/tickets` (scope `support:read`).
   */
  async listTickets(options?: RequestOptions): Promise<SupportTicketListResponse> {
    return this._request({ method: "GET", path: "/support/tickets", idempotent: true }, options);
  }

  /** Get a support ticket with its full message thread — `GET /support/tickets/{id}` (scope `support:read`). */
  async getTicket(id: string, options?: RequestOptions): Promise<SupportTicket> {
    return this._request(
      { method: "GET", path: buildPath("/support/tickets/{id}", { id }), idempotent: true },
      options,
    );
  }

  /**
   * Reply to a support ticket you raised — `POST /support/tickets/{id}/reply`
   * (scope `support:write`). Replying to a resolved or awaiting-customer ticket
   * re-opens it. Not retried automatically: a repeat would post the reply twice.
   */
  async replyToTicket(
    id: string,
    params: SupportTicketReplyParams,
    options?: RequestOptions,
  ): Promise<SupportTicketReplyResponse> {
    return this._request(
      { method: "POST", path: buildPath("/support/tickets/{id}/reply", { id }), body: params, idempotent: false },
      options,
    );
  }
}
