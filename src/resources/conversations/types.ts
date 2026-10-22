import type { ISODateTime, JsonObject, OpenEnum } from "../../types/common.js";
import type { PageMetadata } from "../../types/pagination.js";

/**
 * Conversation status. The schema types it as a string and documents
 * `active | ended | resolved | escalated | abandoned`.
 */
export type ConversationStatus = OpenEnum<"active" | "ended" | "resolved" | "escalated" | "abandoned">;

/** A conversation. */
export interface Conversation {
  id: string;
  customer_id: string;
  workflow_id?: string;
  status: ConversationStatus;
  channel_started?: string;
  channels: string[];
  summary?: string;
  created_at?: ISODateTime;
  updated_at?: ISODateTime;
}

/** Response of `GET /conversations`. */
export interface ConversationListResponse {
  data: Conversation[];
}

/** QA scores attached to a case. */
export interface CaseQaScores {
  resolution: number;
  compliance: number;
  sentiment: number;
  response: number;
  tools: number;
  overall: number;
}

/** A case — the case-management view of a conversation. */
export interface Case {
  id: string;
  customer_id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  status: string;
  channel_started?: string;
  channels: string[];
  workflow_id?: string;
  workflow_name?: string | null;
  summary?: string;
  sentiment_label?: "positive" | "neutral" | "negative";
  resolved?: boolean;
  resolution_reason?: string;
  needs_followup?: boolean;
  qa_scores?: CaseQaScores;
  originator?: "customer" | "agent" | "system";
  last_message?: string;
  message_count?: number;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

/**
 * Response of `GET /cases`.
 * The API documents no request parameter for choosing a page.
 */
export interface CaseListResponse {
  data: Case[];
  pagination: PageMetadata;
}

/** Opt-in transcript payloads documented for the `include` parameter. */
export type TranscriptInclude = OpenEnum<"tool_io" | "files" | "structured" | "delivery">;

/** Query of `GET /conversations/{id}/events`. */
export interface TranscriptParams {
  /** Events per page (default 100, max 1000). */
  limit?: number;
  /** Return events created strictly AFTER this ISO timestamp — pass `next_after` from the previous page. */
  after?: ISODateTime;
  /** Return events created strictly BEFORE this ISO timestamp. */
  before?: ISODateTime;
  /**
   * event_type filter, e.g. `user_message,ai_response`.
   * An array is sent as the documented comma-separated string.
   */
  event_type?: string | readonly string[];
  /**
   * Opt-in payloads: `tool_io`, `files`, `structured`, `delivery`.
   * An array is sent as the documented comma-separated string.
   */
  include?: TranscriptInclude | readonly TranscriptInclude[];
}

/** One transcript event (`conversation_events` row). */
export interface TranscriptEvent {
  id: string;
  event_type: string;
  /** `user | ai | human_agent | system`. */
  actor: OpenEnum<"user" | "ai" | "human_agent" | "system">;
  channel?: string;
  created_at: ISODateTime;
  text?: string;
  tool_name?: string;
  /**
   * TRANSPORT outcome of the call (`success | error | timeout`) — NOT the business
   * result. A tool that returned `{success:false}` is still `success` here; read `tool_output`.
   */
  tool_status?: OpenEnum<"success" | "error" | "timeout">;
  /** Present with `include=tool_io`. */
  tool_input?: JsonObject;
  /** Present with `include=tool_io`. */
  tool_output?: JsonObject;
  tool_error_detail?: string;
  tool_latency_ms?: number;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
  /** Short-lived signed download URL, minted on read (with `include=files`). Never the durable storage key. */
  file_url?: string;
  /** The structured reply as sent (the WhatsApp envelope: `type` + its fields), with `include=structured`. */
  message?: JsonObject;
  /** delivery_status events: the provider state (queued/sent/delivered/read/failed/suppressed). */
  status?: OpenEnum<"queued" | "sent" | "delivered" | "read" | "failed" | "suppressed">;
  /** The provider message id — the same id the `message.status` webhook carries. */
  message_id?: string;
  /** delivery_status events: the provider failure reason, when failed. */
  error?: string;
  /** Set on a platform-initiated send (`public_api_outbound` for POST /messages or POST /outbound). */
  origin?: string;
  /** The `id` returned on the 201 from `POST /messages`. */
  outbound_message_id?: string;
}

/** Response of `GET /conversations/{id}/events`. */
export interface TranscriptResponse {
  data: TranscriptEvent[];
  has_more?: boolean;
  /** Pass as `after` to fetch the next page. */
  next_after?: ISODateTime;
}
