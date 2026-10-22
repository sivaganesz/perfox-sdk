import type { OpenEnum } from "../../types/common.js";

/**
 * Subscribable events: `message.inbound` (a customer wrote to you) and
 * `message.status` (a message you sent changed delivery state).
 */
export type WebhookEvent = "message.inbound" | "message.status";

/** A webhook subscription and its delivery health. */
export interface WebhookSubscription {
  id: string;
  url: string;
  events: OpenEnum<WebhookEvent>[];
  status: OpenEnum<"active" | "disabled">;
  consecutive_failures: number;
  last_delivered_at?: string;
  last_failed_at?: string;
  /** The last delivery error, verbatim. */
  last_error?: string;
  /** Set when the platform disabled the subscription after repeated failures. */
  disabled_reason?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Response of `POST /webhook-subscriptions`.
 *
 * `secret` is the signing secret. It is returned ONCE, here, and can never be
 * read again — store it securely now. Losing it means rotating it with
 * `webhooks.update(id, { rotate_secret: true })`.
 */
export interface WebhookSubscriptionWithSecret extends WebhookSubscription {
  secret: string;
}

/**
 * Response of `PATCH /webhook-subscriptions/{id}`. `secret` is present only when
 * the request set `rotate_secret: true`, and is returned only this once.
 */
export interface WebhookUpdateResponse extends WebhookSubscription {
  secret?: string;
}

/** Body of `POST /webhook-subscriptions`. */
export interface WebhookCreateParams {
  /** HTTPS endpoint (format: uri). */
  url: string;
  /** At least one event. */
  events: WebhookEvent[];
}

/** Body of `PATCH /webhook-subscriptions/{id}`. */
export interface WebhookUpdateParams {
  /** format: uri. */
  url?: string;
  /** At least one event when sent. */
  events?: WebhookEvent[];
  /** Set back to `active` to re-enable; this also clears the failure counter. */
  status?: "active" | "disabled";
  /**
   * Mint a NEW signing secret, returned once in the response. The old secret
   * stops signing immediately.
   */
  rotate_secret?: boolean;
}

/** Response of `GET /webhook-subscriptions`. */
export interface WebhookListResponse {
  subscriptions: WebhookSubscription[];
}

/** Response of `POST /webhook-subscriptions/{id}/test`. */
export interface WebhookTestResponse {
  /** Whether the endpoint accepted the test delivery. */
  delivered: boolean;
  /** The HTTP status your endpoint answered with. */
  status: number;
  error?: string;
}
