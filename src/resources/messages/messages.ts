import { buildPath, type RequestOptions } from "../../client/request.js";
import { Paginator } from "../../core/pagination.js";
import { APIResource } from "../../core/resource.js";
import type {
  Message,
  MessageCreateParams,
  MessageCreateResponse,
  MessageListParams,
  MessageListResponse,
} from "./types.js";

/** Messages API — messages you compose and send on WhatsApp. */
export class Messages extends APIResource {
  /**
   * Send a WhatsApp message — `POST /messages` (scope `conversations:write`).
   *
   * No AI runs — what you pass is what is sent. An owning agent with no
   * WhatsApp Sender action is refused with 422 `sender_not_authorized`
   * (thrown as `ValidationError`). `status: "sent"` means the provider accepted
   * it; follow delivery with {@link get}.
   *
   * Not retried automatically: a repeat could send the message twice.
   */
  async create(params: MessageCreateParams, options?: RequestOptions): Promise<MessageCreateResponse> {
    return this._request({ method: "POST", path: "/messages", body: params, idempotent: false }, options);
  }

  /** One page of sent messages, newest first — `GET /messages` (scope `conversations:read`). */
  async list(params: MessageListParams = {}, options?: RequestOptions): Promise<MessageListResponse> {
    return this._request(
      {
        method: "GET",
        path: "/messages",
        query: {
          to: params.to,
          from: params.from,
          status: params.status,
          since: params.since,
          until: params.until,
          limit: params.limit,
          cursor: params.cursor,
        },
        idempotent: true,
      },
      options,
    );
  }

  /** Iterates every sent message matching the filters across all pages. */
  iterate(params: MessageListParams = {}, options?: RequestOptions): Paginator<MessageListResponse, Message> {
    return new Paginator(
      (cursor) => this.list({ ...params, cursor }, options),
      (page) => page.messages,
      (page) => page.next_cursor,
      params.cursor,
    );
  }

  /**
   * Get one sent message — its current delivery state plus transition history —
   * `GET /messages/{id}` (scope `conversations:read`).
   */
  async get(id: string, options?: RequestOptions): Promise<Message> {
    return this._request({ method: "GET", path: buildPath("/messages/{id}", { id }), idempotent: true }, options);
  }
}
