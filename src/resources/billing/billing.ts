import type { RequestOptions } from "../../client/request.js";
import { APIResource } from "../../core/resource.js";
import { windowQuery } from "../analytics/analytics.js";
import type { AnalyticsWindowParams } from "../analytics/types.js";
import type { CreditBalance, TokenUsage } from "./types.js";

/** Billing API (scope `analytics:read`). */
export class Billing extends APIResource {
  /** Credit balance — `GET /billing/credits`. */
  async getCredits(options?: RequestOptions): Promise<CreditBalance> {
    return this._request({ method: "GET", path: "/billing/credits", idempotent: true }, options);
  }

  /** Token usage: totals plus a per-bucket series for the window — `GET /billing/usage`. */
  async getUsage(params: AnalyticsWindowParams = {}, options?: RequestOptions): Promise<TokenUsage> {
    return this._request(
      { method: "GET", path: "/billing/usage", query: windowQuery(params), idempotent: true },
      options,
    );
  }
}
