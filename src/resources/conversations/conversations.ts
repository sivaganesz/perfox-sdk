import { buildPath, type RequestOptions } from "../../client/request.js";
import { Paginator } from "../../core/pagination.js";
import { APIResource } from "../../core/resource.js";
import type {
  CaseListResponse,
  Conversation,
  ConversationListResponse,
  TranscriptEvent,
  TranscriptParams,
  TranscriptResponse,
} from "./types.js";

/** Conversations API. */
export class Conversations extends APIResource {
  /** List conversations — `GET /conversations` (scope `conversations:read`). */
  async list(options?: RequestOptions): Promise<ConversationListResponse> {
    return this._request({ method: "GET", path: "/conversations", idempotent: true }, options);
  }

  /**
   * List cases (the case-management view of conversations) — `GET /cases`
   * (scope `conversations:read`).
   *
   * The response includes `pagination` metadata, but the API documents no
   * request parameter for selecting a page, so none is offered here.
   */
  async listCases(options?: RequestOptions): Promise<CaseListResponse> {
    return this._request({ method: "GET", path: "/cases", idempotent: true }, options);
  }

  /** Get a conversation — `GET /conversations/{id}` (scope `conversations:read`). */
  async get(id: string, options?: RequestOptions): Promise<Conversation> {
    return this._request(
      { method: "GET", path: buildPath("/conversations/{id}", { id }), idempotent: true },
      options,
    );
  }

  /**
   * One page of a conversation transcript — `GET /conversations/{id}/events`
   * (scope `conversations:read`).
   *
   * By default returns a safe subset (text + tool name/status). Opt into more
   * with `include`. Paginate with `limit` + `after` (the previous `next_after`).
   */
  async getTranscript(id: string, params: TranscriptParams = {}, options?: RequestOptions): Promise<TranscriptResponse> {
    return this._request(
      {
        method: "GET",
        path: buildPath("/conversations/{id}/events", { id }),
        query: {
          limit: params.limit,
          after: params.after,
          before: params.before,
          event_type: joinList(params.event_type),
          include: joinList(params.include),
        },
        idempotent: true,
      },
      options,
    );
  }

  /**
   * Iterates every transcript event across pages, following `next_after` while
   * `has_more` is not `false`.
   */
  iterateTranscript(
    id: string,
    params: TranscriptParams = {},
    options?: RequestOptions,
  ): Paginator<TranscriptResponse, TranscriptEvent> {
    buildPath("/conversations/{id}/events", { id });
    return new Paginator(
      (after) => this.getTranscript(id, { ...params, after }, options),
      (page) => page.data,
      (page) => (page.has_more === false ? undefined : page.next_after),
      params.after,
    );
  }
}

function joinList(value: string | readonly string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string") return value;
  return value.length > 0 ? value.join(",") : undefined;
}
