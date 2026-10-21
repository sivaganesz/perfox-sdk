import type { FileInput } from "../../core/uploads.js";
import type { ISODateTime, OpenEnum, SuccessResponse } from "../../types/common.js";
import type { CursorPageInfo, CursorPageParams } from "../../types/pagination.js";

/** Index status of a Knowledge Base file: `pending | indexed | failed | deleted`. */
export type KnowledgeBaseFileStatus = OpenEnum<"pending" | "indexed" | "failed" | "deleted">;

/** Knowledge Base file metadata. */
export interface KnowledgeBaseFile {
  id: string;
  name: string;
  status: KnowledgeBaseFileStatus;
  mime_type: string;
  file_size: number;
  /** `null` when the file is at the root. */
  folder_id: string | null;
  kb_record_id?: string | null;
  chunk_count?: number;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

/** Input of `POST /kb/files` (sent as `multipart/form-data`). */
export interface KnowledgeBaseUploadParams {
  /**
   * The document bytes (multipart field `file`): a `File`, or
   * `{ data, filename, contentType? }` for a Blob/Buffer/ArrayBuffer.
   */
  file: FileInput;
  /** Display name; defaults to the filename. minLength 1. */
  name?: string;
  /**
   * Target folder id, or `null` / omitted for root.
   * The API does not document how JSON `null` is encoded in multipart, so for
   * `null` the field is simply not sent.
   */
  folder_id?: string | null;
}

/** Query of `GET /kb/files`. */
export interface KnowledgeBaseFileListParams extends CursorPageParams {
  /** Folder id; omit or empty for files at the root. */
  folder_id?: string;
  /** Filter by index status, e.g. `indexed`. */
  status?: KnowledgeBaseFileStatus;
}

/** Response of `GET /kb/files`. */
export interface KnowledgeBaseFileListResponse extends CursorPageInfo {
  data: KnowledgeBaseFile[];
}

/** Body of `POST /kb/search`. Scope to a `kb_id`, a `folder_id`, or (default) all active KBs. */
export interface KnowledgeBaseSearchParams {
  /** minLength 1. */
  query: string;
  kb_id?: string;
  folder_id?: string;
  /** 1–20, default 8. */
  top_k?: number;
}

export interface KnowledgeBaseSearchMatch {
  name: string;
  id: string;
  score: number;
}

/** Response of `POST /kb/search`. */
export interface KnowledgeBaseSearchResponse {
  matches: KnowledgeBaseSearchMatch[];
}

/** Body of `POST /kb/files/{id}/move`. */
export interface KnowledgeBaseMoveFileParams {
  /** Destination folder id, or `null` to move to root. Required. */
  folder_id: string | null;
}

/** A Knowledge Base folder. */
export interface KnowledgeBaseFolder {
  id: string;
  name: string;
  parent_id: string | null;
  path: string;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

/** Query of `GET /kb/folders`. */
export interface KnowledgeBaseFolderListParams {
  /** Parent folder id; omit or empty for root folders. */
  parent_id?: string;
}

/** Response of `GET /kb/folders`. */
export interface KnowledgeBaseFolderListResponse {
  data: KnowledgeBaseFolder[];
}

/** Body of `POST /kb/folders`. */
export interface KnowledgeBaseCreateFolderParams {
  /** minLength 1. */
  name: string;
  parent_id?: string | null;
}

/** Body of `PATCH /kb/folders/{id}` (rename). */
export interface KnowledgeBaseUpdateFolderParams {
  /** New display name. 1–200 characters. */
  name: string;
}

/** An agent affected by deleting a folder. */
export interface KnowledgeBaseAffectedAgent {
  id: string;
  name: string;
  status: string;
}

/** Response of `DELETE /kb/folders/{id}`. */
export interface KnowledgeBaseDeleteFolderResponse extends SuccessResponse {
  affected_agents: KnowledgeBaseAffectedAgent[];
}
