import { buildPath, type RequestOptions } from "../../client/request.js";
import { APIResource } from "../../core/resource.js";
import type { SuccessResponse } from "../../types/common.js";
import type {
  WebhookCreateParams,
  WebhookListResponse,
  WebhookSubscriptionWithSecret,
  WebhookTestResponse,
  WebhookUpdateParams,
  WebhookUpdateResponse,
} from "./types.js";

/**
 * Webhooks API — subscriptions for inbound messages and delivery events.
 *
 * Every delivery carries `X-Perfox-Signature: t=<unix>,v1=<hmac-sha256>`
 * computed over `<t>.<raw body>` with the subscription's secret, plus a
 * stable `X-Perfox-Delivery` id for idempotency. Verify against the RAW body
 * before parsing it.
 */
export class Webhooks extends APIResource {
  /**
   * Subscribe an HTTPS endpoint — `POST /webhook-subscriptions` (scope `webhooks:write`).
   *
   * The signing `secret` is returned ONCE, in this response. Not retried
   * automatically: a repeat would create a second subscription whose secret
   * you would never see.
   */
  async create(params: WebhookCreateParams, options?: RequestOptions): Promise<WebhookSubscriptionWithSecret> {
    return this._request(
      { method: "POST", path: "/webhook-subscriptions", body: params, idempotent: false },
      options,
    );
  }

  /**
   * List webhook subscriptions with their health — `GET /webhook-subscriptions`
   * (scope `webhooks:read`).
   */
  async list(options?: RequestOptions): Promise<WebhookListResponse> {
    return this._request({ method: "GET", path: "/webhook-subscriptions", idempotent: true }, options);
  }

  /**
   * Update or re-enable a subscription — `PATCH /webhook-subscriptions/{id}`
   * (scope `webhooks:write`). Pass `rotate_secret: true` to mint a new signing
   * secret, returned once in the response.
   */
  async update(id: string, params: WebhookUpdateParams, options?: RequestOptions): Promise<WebhookUpdateResponse> {
    return this._request(
      { method: "PATCH", path: buildPath("/webhook-subscriptions/{id}", { id }), body: params, idempotent: false },
      options,
    );
  }

  /** Delete a subscription — `DELETE /webhook-subscriptions/{id}` (scope `webhooks:write`). */
  async delete(id: string, options?: RequestOptions): Promise<SuccessResponse> {
    return this._request(
      { method: "DELETE", path: buildPath("/webhook-subscriptions/{id}", { id }), idempotent: true },
      options,
    );
  }

  /**
   * Send a signed synthetic `webhook.test` event and report what the endpoint
   * answered, synchronously — `POST /webhook-subscriptions/{id}/test`
   * (scope `webhooks:write`). Does not count toward failures.
   */
  async test(id: string, options?: RequestOptions): Promise<WebhookTestResponse> {
    return this._request(
      { method: "POST", path: buildPath("/webhook-subscriptions/{id}/test", { id }), idempotent: false },
      options,
    );
  }
}
