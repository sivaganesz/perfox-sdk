import type { ISODateTime, OpenEnum } from "../../types/common.js";

/**
 * Routes a ticket: `forward_deployment` for help with your implementation,
 * `platform` for a suspected platform defect.
 */
export type SupportTicketCategory = "forward_deployment" | "platform";

export type SupportTicketSeverity = "low" | "medium" | "high" | "urgent";

/** `open | in_progress | awaiting_customer | resolved | closed`. */
export type SupportTicketStatus = OpenEnum<"open" | "in_progress" | "awaiting_customer" | "resolved" | "closed">;

/** Where the ticket was raised: `studio | api | chatbot`. */
export type SupportTicketChannel = OpenEnum<"studio" | "api" | "chatbot">;

/** The person a ticket is attributed to. */
export interface SupportTicketPerson {
  name: string;
  email: string;
}

/** Fields shared by a ticket in a list and a full ticket. */
interface SupportTicketBase {
  id: string;
  ticket_number: number;
  subject: string;
  category: OpenEnum<SupportTicketCategory>;
  severity: OpenEnum<SupportTicketSeverity>;
  status: SupportTicketStatus;
  created_via: SupportTicketChannel;
  created_by: SupportTicketPerson;
  assigned: boolean;
  created_at: ISODateTime;
  last_activity_at: ISODateTime;
}

/** A ticket as returned by `GET /support/tickets`. */
export interface SupportTicketSummary extends SupportTicketBase {
  message_count: number;
}

/** One message in a ticket thread. */
export interface SupportTicketMessage {
  id: string;
  /** `requester | responder`. */
  author_kind: OpenEnum<"requester" | "responder">;
  author_name: string;
  body: string;
  attachment_count: number;
  created_at: ISODateTime;
}

/** A ticket with its full message thread. */
export interface SupportTicket extends SupportTicketBase {
  description: string;
  assigned_team?: string;
  messages: SupportTicketMessage[];
  updated_at: ISODateTime;
}

/** Response of `GET /support/tickets` (newest activity first). */
export interface SupportTicketListResponse {
  data: SupportTicketSummary[];
}

/** Body of `POST /support/tickets`. */
export interface SupportTicketCreateParams {
  /** 3–200 characters. */
  subject: string;
  /** 1–8000 characters. Attachments are not supported here yet — link to them instead. */
  description: string;
  category: SupportTicketCategory;
  /** Default `"medium"`. */
  severity?: SupportTicketSeverity;
  /**
   * Attribute the ticket to one of your workspace users (format: email, up to
   * 320 characters). Omit to raise it as the API integration.
   */
  requester_email?: string;
}

/** Body of `POST /support/tickets/{id}/reply`. */
export interface SupportTicketReplyParams {
  /** 1–8000 characters. */
  body: string;
  /** format: email, up to 320 characters. */
  requester_email?: string;
}

/** Response of `POST /support/tickets/{id}/reply`. */
export interface SupportTicketReplyResponse {
  id: string;
  /** True when the reply re-opened a resolved or awaiting-customer ticket. */
  reopened: boolean;
  message: {
    id: string;
    author_name: string;
    body: string;
    created_at: ISODateTime;
  };
}
