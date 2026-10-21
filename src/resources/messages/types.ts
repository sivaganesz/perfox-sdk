import type { CursorPageInfo, CursorPageParams } from "../../types/pagination.js";
import type { WhatsAppTemplate } from "../../types/whatsapp.js";

/**
 * Media sent by PUBLIC URL. The provider fetches it, so the URL must stay
 * reachable until fetched. Per the docs, audio takes no caption and `filename`
 * applies to documents only — the API refuses both otherwise.
 */
export type MessageMedia =
  | { type: "image" | "video"; url: string; caption?: string; filename?: never }
  | { type: "audio"; url: string; caption?: never; filename?: never }
  | {
      type: "document";
      url: string;
      /** Up to 1024 characters. */
      caption?: string;
      /** Up to 255 characters. */
      filename?: string;
    };

/** A map pin. */
export interface MessageLocation {
  /** -90 to 90. */
  latitude: number;
  /** -180 to 180. */
  longitude: number;
  /** Up to 200 characters. */
  name?: string;
  /** Up to 500 characters. */
  address?: string;
}

/**
 * The sender: exactly one of `from` (your business number, which resolves the
 * agent that owns it) or `agent_id`.
 */
export type MessageSender =
  | { from: string; agent_id?: never }
  | { agent_id: string; from?: never };

/**
 * The content: exactly one of `text`, `media`, `location` or `template`.
 * Outside WhatsApp's 24-hour service window only a template is deliverable.
 */
export type MessageContent =
  | { text: string; media?: never; location?: never; template?: never }
  | { media: MessageMedia; text?: never; location?: never; template?: never }
  | { location: MessageLocation; text?: never; media?: never; template?: never }
  | { template: WhatsAppTemplate; text?: never; media?: never; location?: never };

/** Fields common to every `POST /messages` body. */
export interface MessageCreateBase {
  /**
   * Optional. Documented enum is `whatsapp | sms | email | phone`, but any value
   * other than `whatsapp` is REFUSED — use `outbound.create` for other channels.
   */
  channel?: "whatsapp" | "sms" | "email" | "phone";
  /** Recipient. minLength 1. */
  to: string;
  customer_id?: string;
}

/**
 * Body of `POST /messages`. The "exactly one of" rules from the docs are
 * enforced by these types at compile time; the server remains the authority.
 */
export type MessageCreateParams = MessageCreateBase & MessageSender & MessageContent;

/** Response of `POST /messages`. */
export interface MessageCreateResponse {
  /** Use with `messages.get` to follow delivery. */
  id: string;
  conversation_id: string;
  agent_id: string;
  channel: "whatsapp";
  to: string;
  from?: string;
  send_authorized: boolean;
  status: "sent" | "failed" | "suppressed";
  provider_message_id: string;
}

export type MessageKind = "text" | "template" | "image" | "audio" | "video" | "document" | "location";

/**
 * Delivery state. `sent` means the provider ACCEPTED it; `delivered` and `read`
 * arrive asynchronously; `failed` carries the provider's reason.
 */
export type MessageStatus = "sent" | "delivered" | "read" | "failed";

export interface MessageStatusTransition {
  status: string;
  at: string;
  error?: string;
}

/** A message you sent, with its delivery history. */
export interface Message {
  id: string;
  conversation_id: string;
  customer_id: string;
  agent_id: string;
  channel: string;
  from: string;
  to: string;
  kind: MessageKind;
  text: string;
  template_name?: string;
  status: MessageStatus;
  status_history: MessageStatusTransition[];
  provider_message_id: string;
  error?: string;
  created_at: string;
  updated_at: string;
}

/** Query of `GET /messages`. */
export interface MessageListParams extends CursorPageParams {
  to?: string;
  from?: string;
  status?: MessageStatus;
  since?: string;
  until?: string;
}

/** Response of `GET /messages` (newest first). */
export interface MessageListResponse extends CursorPageInfo {
  messages: Message[];
}
