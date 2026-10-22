import type { ISODateTime, JsonObject, OpenEnum } from "../../types/common.js";

/** Provider types accepted by `POST /credentials`. */
export type CredentialType =
  | "exotel"
  | "gemini"
  | "openai"
  | "sarvam"
  | "anthropic"
  | "groq"
  | "elevenlabs"
  | "zilliz"
  | "resend"
  | "do_spaces"
  | "slack"
  | "jira"
  | "freshdesk"
  | "google_sheets"
  | "salesforce"
  | "hubspot"
  | "livekit"
  | "twilio"
  | "plivo"
  | "aws_ses"
  | "sendgrid"
  | "postmark"
  | "mailjet"
  | "mailgun"
  | "gmail"
  | "smtp_imap"
  | "office365_email"
  | "postgres"
  | "mysql"
  | "mongodb_external"
  | "aws_s3"
  | "office365"
  | "google_drive"
  | "meta_whatsapp"
  | "custom"
  | "google_speech"
  | "mcp_oauth"
  | "app_platform_key";

/** `connected | error | not_configured | pending_verification`. */
export type CredentialStatus = OpenEnum<"connected" | "error" | "not_configured" | "pending_verification">;

/**
 * A stored provider credential. Secret config values are NEVER returned —
 * only the names of the keys that are set (`config_fields`).
 */
export interface Credential {
  id: string;
  name: string;
  /** The provider type (a plain string in responses). */
  type: string;
  description?: string;
  status: CredentialStatus;
  /** Names of config keys that are set (values are never returned). */
  config_fields: string[];
  last_tested?: ISODateTime | null;
  created_at?: ISODateTime;
  updated_at?: ISODateTime;
}

/** Body of `POST /credentials`. */
export interface CredentialRegisterParams {
  /** 1–200 characters. */
  name: string;
  type: CredentialType;
  /** Default `""`. */
  description?: string;
  /**
   * Provider connection settings, including secrets. Stored server-side and
   * never returned. The SDK never logs request bodies.
   */
  config: JsonObject;
}

/** Response of `GET /credentials`. */
export interface CredentialListResponse {
  data: Credential[];
}

/** A number / sender that belongs to a credential. */
export interface CredentialResource {
  identifier: string;
  label: string;
  channel: string;
  capabilities: string[];
  provider: string;
  status: string;
  /** The agent that owns this resource, if any. */
  assigned_agent?: { id: string; name: string };
}

/** Response of `GET /credentials/{id}/resources`. */
export interface CredentialResourceListResponse {
  data: CredentialResource[];
}
