import type { ISODateTime } from "../../types/common.js";
import type { CursorPageInfo, CursorPageParams } from "../../types/pagination.js";
import type { Conversation } from "../conversations/types.js";

/** Free-form tenant context attached to a customer (`plan_tier`, `account_id`, …). */
export type CustomerAttributes = Record<string, string>;

/** A customer record. */
export interface Customer {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  external_id?: string;
  attributes?: CustomerAttributes;
  tags?: string[];
  preferred_language?: string;
  created_at?: ISODateTime;
  updated_at?: ISODateTime;
}

/** Identity and profile fields accepted by create-or-update and update. */
export interface CustomerFields {
  /** minLength 1. */
  name?: string;
  /** Any format; canonicalised to E.164 server-side. minLength 1. */
  phone?: string;
  /** format: email. */
  email?: string;
  /** Your system's stable user id. minLength 1. */
  external_id?: string;
  /** Free-form tenant context (plan_tier, account_id, …). */
  attributes?: CustomerAttributes;
  preferred_language?: string;
  tags?: string[];
}

/** Body of `POST /customers` (create-or-find by phone/email/external_id). */
export type CustomerCreateParams = CustomerFields;

/** Body of `PATCH /customers/{id}`. */
export type CustomerUpdateParams = CustomerFields;

/** Response of `GET /customers`. */
export interface CustomerListResponse {
  data: Customer[];
}

/** Response of `GET /customers/{id}/details`. */
export interface CustomerDetails {
  customer: Customer;
  stats: CustomerStats;
  insights: CustomerInsights;
}

export interface CustomerStats {
  /** ≥ 0. */
  conversation_count: number;
  /** Every channel the customer has used, busiest first. */
  channels: string[];
  /** "Customer since" — their first conversation. */
  first_active_at: ISODateTime | null;
  last_active_at: ISODateTime | null;
}

export interface CustomerInsights {
  /** Conversations touching each channel; one that moved channel counts once per channel. */
  channel_mix: Array<{ channel: string; count: number }>;
  resolution: CustomerResolution;
}

export interface CustomerResolution {
  resolved: number;
  escalated: number;
  abandoned: number;
  active: number;
  /** Closed by the system without a resolved verdict (e.g. idle timeout, call ended). */
  ended: number;
  total: number;
  /** Percentage 0–100 — the same definition as `/analytics/summary`. */
  resolution_rate: number;
}

/** `status` filter values documented for `GET /customers/{id}/conversations`. */
export type CustomerConversationStatusFilter = "active" | "ended" | "resolved" | "escalated" | "abandoned";

/** Query of `GET /customers/{id}/conversations`. */
export interface CustomerConversationListParams extends CursorPageParams {
  status?: CustomerConversationStatusFilter;
}

/** Response of `GET /customers/{id}/conversations` (newest first). */
export interface CustomerConversationListResponse extends CursorPageInfo {
  conversations: Conversation[];
}

/** An identifier combination. Combinations are AND-ed. */
export interface CustomerLinkIdentifiers {
  /** format: email. */
  email?: string;
  /** Any format; canonicalised to E.164 server-side. minLength 1. */
  mobile?: string;
  /** Discriminator for shared email/mobile (e.g. family members). minLength 1. */
  name?: string;
}

/** Body of `POST /customer/link`, and one item of the batch form. */
export interface CustomerLinkParams {
  /** Your system's stable user id this combination maps to. minLength 1. */
  external_id: string;
  identifiers: CustomerLinkIdentifiers;
}

/** A stored identity link. */
export interface CustomerLink {
  external_id: string;
  email?: string;
  mobile?: string;
  name?: string;
  /** The existing customer the external_id was applied to immediately, if any. */
  applied_customer_id?: string;
  created_at?: ISODateTime;
  updated_at?: ISODateTime;
}

/** Query of `GET /customer/link` and `DELETE /customer/link`. */
export interface CustomerLinkLookupParams {
  /** Your system's id — every link to it is read / removed. minLength 1. */
  external_id: string;
}

/** Response of `GET /customer/link`. */
export interface CustomerLinkListResponse {
  links: CustomerLink[];
}

/** Response of `DELETE /customer/link`. */
export interface CustomerLinkDeleteResponse {
  deleted: number;
  detached_customer_ids: string[];
}

/** Body of `POST /customer/link/batch`. */
export interface CustomerLinkBatchParams {
  /** 1–500 links. */
  links: CustomerLinkParams[];
}

export type CustomerLinkBatchStatus = "linked" | "link_conflict" | "identity_conflict";

export interface CustomerLinkBatchResult {
  index: number;
  external_id: string;
  status: CustomerLinkBatchStatus;
  applied_customer_id?: string;
  current_external_id?: string;
  customer_ids?: string[];
}

/** Response of `POST /customer/link/batch`. */
export interface CustomerLinkBatchResponse {
  results: CustomerLinkBatchResult[];
}
