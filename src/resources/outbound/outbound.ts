import type { RequestOptions } from "../../client/request.js";
import { APIResource } from "../../core/resource.js";
import type { OutboundCreateParams, OutboundCreateResponse } from "./types.js";

/** Outbound API (scope `conversations:write`). */
export class Outbound extends APIResource {
  /**
   * Reach out to a customer — `POST /outbound`.
   *
   * Starts an outbound conversation on phone, sms, whatsapp or email using a
   * PUBLISHED agent. A phone call always opens a NEW conversation; text
   * channels continue the open thread. The response reports the started
   * execution — it does not mean the conversation has finished, or that a
   * message was delivered (check `send_authorized`).
   *
   * Not retried automatically: a repeat could start a second call or send twice.
   */
  async create(params: OutboundCreateParams, options?: RequestOptions): Promise<OutboundCreateResponse> {
    return this._request({ method: "POST", path: "/outbound", body: params, idempotent: false }, options);
  }
}
