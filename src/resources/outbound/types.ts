import type { WhatsAppTemplate } from "../../types/whatsapp.js";

export type OutboundChannel = "phone" | "sms" | "whatsapp" | "email";

/** Body of `POST /outbound`. */
export interface OutboundCreateParams {
  /** A PUBLISHED agent with a Trigger node for `channel`. minLength 1. */
  agent_id: string;
  channel: OutboundChannel;
  /** Recipient. minLength 1. */
  to: string;
  /** Up to 2000 characters. */
  opening_message?: string;
  customer_id?: string;
  template?: WhatsAppTemplate;
}

/**
 * Response of `POST /outbound`.
 *
 * Check `send_authorized`: on email/sms/whatsapp the agent can only send if the
 * matching Sender node is wired on its canvas.
 */
export interface OutboundCreateResponse {
  conversation_id: string;
  execution_id: string;
  status: string;
  channel: string;
  send_authorized: boolean;
  /** Perfox's message id; present when a text message was sent. */
  message_id?: string;
  /** The carrier's message id — may be an empty string. */
  provider_message_id: string;
}
