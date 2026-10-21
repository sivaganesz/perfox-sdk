import type { AnalyticsWindow } from "../analytics/types.js";

/**
 * Response of `GET /billing/credits`.
 * Values are returned exactly as the API sends them — no unit conversion or rounding.
 */
export interface CreditBalance {
  balance: number;
  balance_mc: number;
  low_balance: boolean;
  out_of_credits: boolean;
}

export interface TokenUsageTotals {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  llm_calls: number;
}

export interface TokenUsageBucket {
  date: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  call_count: number;
}

/** Response of `GET /billing/usage` — token totals plus a per-bucket series. */
export interface TokenUsage {
  window: AnalyticsWindow;
  totals: TokenUsageTotals;
  by_date: TokenUsageBucket[];
}
