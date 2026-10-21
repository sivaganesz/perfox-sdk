import type { QueryParams, RequestOptions } from "../../client/request.js";
import { APIResource } from "../../core/resource.js";
import type {
  AnalyticsSummary,
  AnalyticsWindowParams,
  ChannelBreakdownResponse,
  ConversationsOverTimeResponse,
} from "./types.js";

/** Analytics API (scope `analytics:read`). */
export class Analytics extends APIResource {
  /**
   * Dashboard summary — `GET /analytics/summary`. Total conversations,
   * resolution rate, token usage and channel mix for a window, in one call.
   */
  async getSummary(params: AnalyticsWindowParams = {}, options?: RequestOptions): Promise<AnalyticsSummary> {
    return this._request(
      { method: "GET", path: "/analytics/summary", query: windowQuery(params), idempotent: true },
      options,
    );
  }

  /** Conversations over time — `GET /analytics/conversations-over-time`. */
  async getConversationsOverTime(
    params: AnalyticsWindowParams = {},
    options?: RequestOptions,
  ): Promise<ConversationsOverTimeResponse> {
    return this._request(
      { method: "GET", path: "/analytics/conversations-over-time", query: windowQuery(params), idempotent: true },
      options,
    );
  }

  /** Conversation volume by channel — `GET /analytics/channel-breakdown`. */
  async getChannelBreakdown(params: AnalyticsWindowParams = {}, options?: RequestOptions): Promise<ChannelBreakdownResponse> {
    return this._request(
      { method: "GET", path: "/analytics/channel-breakdown", query: windowQuery(params), idempotent: true },
      options,
    );
  }
}

/** Picks only the documented window parameters. */
export function windowQuery(params: AnalyticsWindowParams): QueryParams {
  return {
    days: params.days,
    start_date: params.start_date,
    end_date: params.end_date,
    interval: params.interval,
  };
}
