import { buildPath, type RequestOptions } from "../../client/request.js";
import { Paginator } from "../../core/pagination.js";
import { APIResource } from "../../core/resource.js";
import type { Call, CallListParams, CallListResponse, CallRecordings } from "./types.js";

/** Calls API — voice conversations (scope `conversations:read`). */
export class Calls extends APIResource {
  /**
   * One page of calls, newest first, with duration and recording availability —
   * `GET /calls`. Pass the returned `next_cursor` as `cursor`.
   */
  async list(params: CallListParams = {}, options?: RequestOptions): Promise<CallListResponse> {
    return this._request(
      {
        method: "GET",
        path: "/calls",
        query: {
          limit: params.limit,
          cursor: params.cursor,
          status: params.status,
          start_date: params.start_date,
          end_date: params.end_date,
        },
        idempotent: true,
      },
      options,
    );
  }

  /** Iterates every call matching the filters across all pages. */
  iterate(params: CallListParams = {}, options?: RequestOptions): Paginator<CallListResponse, Call> {
    return new Paginator(
      (cursor) => this.list({ ...params, cursor }, options),
      (page) => page.data,
      (page) => page.next_cursor,
      params.cursor,
    );
  }

  /** Get a call — `GET /calls/{id}`. */
  async get(id: string, options?: RequestOptions): Promise<Call> {
    return this._request({ method: "GET", path: buildPath("/calls/{id}", { id }), idempotent: true }, options);
  }

  /**
   * Get recording playback URLs — `GET /conversations/{id}/recordings`.
   * Short-lived signed URLs for the caller, AI and combined stereo legs.
   *
   * @param conversationId The call's `conversation_id`.
   */
  async getRecordings(conversationId: string, options?: RequestOptions): Promise<CallRecordings> {
    return this._request(
      { method: "GET", path: buildPath("/conversations/{id}/recordings", { id: conversationId }), idempotent: true },
      options,
    );
  }
}
