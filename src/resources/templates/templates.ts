import type { RequestOptions } from "../../client/request.js";
import { APIResource } from "../../core/resource.js";
import type { TemplateListParams, TemplateListResponse, TemplateSyncResponse } from "./types.js";

/** Templates API — the approved WhatsApp templates `messages.create` can send. */
export class Templates extends APIResource {
  /**
   * Pull the latest templates from every connected WhatsApp provider —
   * `POST /templates/sync` (scope `conversations:write`).
   *
   * This is where provider cost lives (one read per template, subject to
   * provider rate limits), so it is not retried automatically. Check `errors`:
   * a successful sync can still name connections that could not be asked.
   */
  async sync(options?: RequestOptions): Promise<TemplateSyncResponse> {
    return this._request({ method: "POST", path: "/templates/sync", idempotent: false }, options);
  }

  /**
   * List the stored WhatsApp templates and what each one needs filled in —
   * `GET /templates` (scope `conversations:read`).
   *
   * Served from this workspace's stored copy (never touches a provider). The
   * list is not filtered: only `status: "approved"` is sendable. `synced_at:
   * null` means the workspace has never synced.
   */
  async list(params: TemplateListParams = {}, options?: RequestOptions): Promise<TemplateListResponse> {
    return this._request(
      { method: "GET", path: "/templates", query: { number: params.number }, idempotent: true },
      options,
    );
  }
}
