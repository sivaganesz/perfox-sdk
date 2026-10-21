/** Bucket size accepted by the analytics and token-usage endpoints. */
export type AnalyticsInterval = "day" | "week" | "month";

/**
 * Time-window query shared by the analytics and billing-usage endpoints.
 * Use `days` for a rolling window, or explicit `start_date` / `end_date`.
 * (Date formats are not specified by the API; values are sent as given.)
 */
export interface AnalyticsWindowParams {
  /** Rolling window in days, 1–365. */
  days?: number;
  start_date?: string;
  end_date?: string;
  interval?: AnalyticsInterval;
}

/** The window the figures were computed over. */
export interface AnalyticsWindow {
  start_date: string | null;
  end_date: string | null;
}

export interface ChannelCount {
  channel: string;
  count: number;
}

/** Response of `GET /analytics/summary`. */
export interface AnalyticsSummary {
  window: AnalyticsWindow;
  conversations: {
    total: number;
    active: number;
    resolved: number;
    escalated: number;
    abandoned: number;
    resolution_rate: number;
  };
  tokens: {
    input: number;
    output: number;
    total: number;
    llm_calls: number;
  };
  channels: ChannelCount[];
}

/** One bucket of `GET /analytics/conversations-over-time`. */
export interface ConversationsOverTimePoint {
  date: string;
  count: number;
  resolved: number;
}

/** Response of `GET /analytics/conversations-over-time`. */
export interface ConversationsOverTimeResponse {
  data: ConversationsOverTimePoint[];
}

/** Response of `GET /analytics/channel-breakdown`. */
export interface ChannelBreakdownResponse {
  data: ChannelCount[];
}
