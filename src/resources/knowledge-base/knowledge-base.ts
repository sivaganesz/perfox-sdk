import { buildPath, type RequestOptions } from "../../client/request.js";
import { Paginator } from "../../core/pagination.js";
import { APIResource } from "../../core/resource.js";
import { toUploadPart } from "../../core/uploads.js";
import type { SuccessResponse } from "../../types/common.js";
import type {
  KnowledgeBaseCreateFolderParams,
  KnowledgeBaseDeleteFolderResponse,
  KnowledgeBaseFile,
  KnowledgeBaseFileListParams,
  KnowledgeBaseFileListResponse,
  KnowledgeBaseFolder,
  KnowledgeBaseFolderListParams,
  KnowledgeBaseFolderListResponse,
  KnowledgeBaseMoveFileParams,
  KnowledgeBaseSearchParams,
  KnowledgeBaseSearchResponse,
  KnowledgeBaseUpdateFolderParams,
  KnowledgeBaseUploadParams,
} from "./types.js";

/** Knowledge Base API — files, folders and semantic search. */
export class KnowledgeBase extends APIResource {
  /**
   * Upload a Knowledge Base document — `POST /kb/files` (scope `kb:write`).
   *
   * Indexing is asynchronous: the returned file is `pending`; poll
   * {@link getFile} until `status` is `indexed`.
   */
  async uploadFile(params: KnowledgeBaseUploadParams, options?: RequestOptions): Promise<KnowledgeBaseFile> {
    const { blob, filename } = toUploadPart(params.file);
    const form = new FormData();
    form.append("file", blob, filename);
    if (params.name !== undefined) form.append("name", params.name);
    if (params.folder_id !== undefined && params.folder_id !== null) form.append("folder_id", params.folder_id);
    return this._request({ method: "POST", path: "/kb/files", form, idempotent: false }, options);
  }

  /** One page of Knowledge Base files — `GET /kb/files` (scope `kb:read`). */
  async listFiles(params: KnowledgeBaseFileListParams = {}, options?: RequestOptions): Promise<KnowledgeBaseFileListResponse> {
    return this._request(
      {
        method: "GET",
        path: "/kb/files",
        query: { folder_id: params.folder_id, status: params.status, limit: params.limit, cursor: params.cursor },
        idempotent: true,
      },
      options,
    );
  }

  /** Iterates every Knowledge Base file matching the filters across all pages. */
  iterateFiles(
    params: KnowledgeBaseFileListParams = {},
    options?: RequestOptions,
  ): Paginator<KnowledgeBaseFileListResponse, KnowledgeBaseFile> {
    return new Paginator(
      (cursor) => this.listFiles({ ...params, cursor }, options),
      (page) => page.data,
      (page) => page.next_cursor,
      params.cursor,
    );
  }

  /** Search the Knowledge Base (semantic) — `POST /kb/search` (scope `kb:read`). */
  async search(params: KnowledgeBaseSearchParams, options?: RequestOptions): Promise<KnowledgeBaseSearchResponse> {
    // Read-only, so safe to retry.
    return this._request({ method: "POST", path: "/kb/search", body: params, idempotent: true }, options);
  }

  /** Get Knowledge Base file metadata — `GET /kb/files/{id}` (scope `kb:read`). */
  async getFile(id: string, options?: RequestOptions): Promise<KnowledgeBaseFile> {
    return this._request({ method: "GET", path: buildPath("/kb/files/{id}", { id }), idempotent: true }, options);
  }

  /** Delete a Knowledge Base file — `DELETE /kb/files/{id}` (scope `kb:write`). */
  async deleteFile(id: string, options?: RequestOptions): Promise<SuccessResponse> {
    return this._request({ method: "DELETE", path: buildPath("/kb/files/{id}", { id }), idempotent: true }, options);
  }

  /** Move a Knowledge Base file to a folder (or root with `null`) — `POST /kb/files/{id}/move` (scope `kb:write`). */
  async moveFile(id: string, params: KnowledgeBaseMoveFileParams, options?: RequestOptions): Promise<SuccessResponse> {
    return this._request(
      { method: "POST", path: buildPath("/kb/files/{id}/move", { id }), body: params, idempotent: false },
      options,
    );
  }

  /** List Knowledge Base folders — `GET /kb/folders` (scope `kb:read`). */
  async listFolders(
    params: KnowledgeBaseFolderListParams = {},
    options?: RequestOptions,
  ): Promise<KnowledgeBaseFolderListResponse> {
    return this._request(
      { method: "GET", path: "/kb/folders", query: { parent_id: params.parent_id }, idempotent: true },
      options,
    );
  }

  /** Create a Knowledge Base folder — `POST /kb/folders` (scope `kb:write`). */
  async createFolder(params: KnowledgeBaseCreateFolderParams, options?: RequestOptions): Promise<KnowledgeBaseFolder> {
    return this._request({ method: "POST", path: "/kb/folders", body: params, idempotent: false }, options);
  }

  /** Rename a Knowledge Base folder — `PATCH /kb/folders/{id}` (scope `kb:write`). */
  async updateFolder(
    id: string,
    params: KnowledgeBaseUpdateFolderParams,
    options?: RequestOptions,
  ): Promise<KnowledgeBaseFolder> {
    return this._request(
      { method: "PATCH", path: buildPath("/kb/folders/{id}", { id }), body: params, idempotent: false },
      options,
    );
  }

  /**
   * Delete an EMPTY Knowledge Base folder — `DELETE /kb/folders/{id}` (scope `kb:write`).
   * The response lists agents affected by the deletion.
   */
  async deleteFolder(id: string, options?: RequestOptions): Promise<KnowledgeBaseDeleteFolderResponse> {
    return this._request(
      { method: "DELETE", path: buildPath("/kb/folders/{id}", { id }), idempotent: true },
      options,
    );
  }
}
