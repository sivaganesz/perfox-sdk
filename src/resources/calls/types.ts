import type { CursorPageInfo, CursorPageParams } from "../../types/pagination.js";

export type CallDirection = "inbound" | "outbound" | "unknown";

/** A voice conversation (phone or web voice). */
export interface Call {
  conversation_id: string;
  customer_id: string;
  channel: string;
  direction: CallDirection;
  status: string;
  /** Timestamp string, or `null`. */
  started_at: string | null;
  /** Timestamp string, or `null`. */
  ended_at: string | null;
  duration_seconds: number | null;
  has_recording: boolean;
  summary?: string;
  end_user?: { name?: string; phone?: string };
}

/** Query of `GET /calls`. */
export interface CallListParams extends CursorPageParams {
  status?: string;
  start_date?: string;
  end_date?: string;
}

/** Response of `GET /calls` (newest first). */
export interface CallListResponse extends CursorPageInfo {
  data: Call[];
}

export type RecordingLeg = "caller" | "ai" | "combined";

/** Response of `GET /conversations/{id}/recordings`. */
export interface CallRecordings {
  conversation_id: string;
  /** Lifetime of the signed URLs. Fetch them when the player opens; do not store them. */
  expires_in_seconds: number;
  recordings: Array<{ leg: RecordingLeg; url: string }>;
}
