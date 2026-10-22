import type { WhatsAppTemplateButton, WhatsAppTemplateHeader } from "../../types/whatsapp.js";

/** Response of `POST /templates/sync`. */
export interface TemplateSyncResponse {
  /** Rows recorded. */
  synced: number;
  /** Rows that changed since the last sync. */
  changed: number;
  /** Rows the providers stopped reporting (marked absent, never deleted). */
  absent: number;
  /**
   * Connections that could not be asked (e.g. an expired token). Part of a
   * SUCCESSFUL sync: providers that answered are still recorded.
   */
  errors: Array<{ provider: string; message: string }>;
}

/** Provider approval status. Only `approved` is sendable. */
export type StoredTemplateStatus = "approved" | "pending" | "rejected" | "paused" | "disabled" | "unknown";

/** What a template needs filled in when sending it with `messages.create`. */
export interface StoredTemplateParams {
  /** How many ordered values `template.body_parameters` must carry. */
  body_parameter_count: number;
  /** The approved body text, so you can see what you are filling. */
  body_text?: string;
  /** Present when the approved header takes a per-send value. */
  header?: { type: WhatsAppTemplateHeader["type"] };
  /** Buttons needing a value, with their index in the APPROVED button list. */
  buttons?: Array<{ sub_type: WhatsAppTemplateButton["sub_type"]; index: number }>;
  unsupported?: string[];
}

/** A WhatsApp template stored for this workspace. */
export interface StoredTemplate {
  name: string;
  language: string;
  status: StoredTemplateStatus;
  category?: string;
  provider_template_id?: string;
  credential_id: string;
  provider: string;
  raw_status?: string;
  /**
   * ABSENT means the fill spec is UNDETERMINED (the provider row had no
   * readable components) — not "nothing to fill".
   */
  params?: StoredTemplateParams;
  waba_id?: string;
  numbers?: string[];
}

/** Query of `GET /templates`. */
export interface TemplateListParams {
  /** Documented without a description; sent as given. */
  number?: string;
}

/** Response of `GET /templates`. */
export interface TemplateListResponse {
  /** Every stored template, unfiltered by status. */
  templates: StoredTemplate[];
  /**
   * When the stored copy was last refreshed by `templates.sync`.
   * `null` means this workspace has NEVER synced — not "no templates".
   */
  synced_at: string | null;
}
