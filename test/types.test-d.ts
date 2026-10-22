/**
 * Type-level contract test: the hand-written SDK types must match the types
 * generated from the OpenAPI spec (`npm run spec:types`).
 *
 * For each operation we check, recursively:
 *  - both directions of assignability (catches missing/extra required fields,
 *    optional-vs-required, nullability, enum drift), and
 *  - equality of the full set of property paths (catches extra/missing
 *    optional fields, which assignability alone tolerates).
 *
 * Where the SDK deliberately narrows an input (e.g. the documented "exactly one
 * of" rules on POST /messages), only SDK → spec assignability is required.
 */
import { describe, expectTypeOf, test } from "vitest";
import type * as SDK from "../src/index.js";
import type { operations } from "./generated/openapi.js";

type Json = "application/json";
type Res<Op extends keyof operations, Code extends keyof operations[Op]["responses"]> =
  operations[Op]["responses"][Code] extends { content: { [K in Json]: infer B } } ? B : never;
type Body<Op extends keyof operations> =
  NonNullable<operations[Op]["requestBody"]> extends { content: { [K in Json]: infer B } } ? B : never;
type Query<Op extends keyof operations> = NonNullable<operations[Op]["parameters"]["query"]>;

/**
 * Every property path of T ("a", "a.b", "list.item"), looking through arrays and
 * nullability. Primitives are checked first: `string & {}` (used by open enums)
 * would otherwise count as an object.
 */
type Paths<T> = T extends string | number | boolean | bigint | symbol
  ? never
  : T extends readonly (infer U)[]
    ? Paths<U>
    : T extends object
      ? { [K in keyof T & string]-?: K | `${K}.${Paths<NonNullable<T[K]>>}` }[keyof T & string]
      : never;

type Assignable<A, B> = [A] extends [B] ? true : false;
type SamePaths<A, B> = [Paths<A>] extends [Paths<B>] ? ([Paths<B>] extends [Paths<A>] ? true : false) : false;

/** Same shape: mutually assignable and identical property paths. */
type Matches<Mine, Spec> = Assignable<Mine, Spec> extends true
  ? Assignable<Spec, Mine> extends true
    ? SamePaths<Mine, Spec>
    : "spec is not assignable to SDK type"
  : "SDK type is not assignable to spec";

/** SDK input narrower than the spec on purpose: SDK ⊆ spec, same property paths. */
type NarrowerInput<Mine, Spec> = Assignable<Mine, Spec> extends true
  ? SamePaths<Mine, Spec>
  : "SDK type is not assignable to spec";

describe("Customers", () => {
  test("customers.create", () => {
    expectTypeOf<Matches<SDK.CustomerCreateParams, Body<"customers.create">>>().toEqualTypeOf<true>();
    expectTypeOf<Matches<SDK.Customer, Res<"customers.create", 200>>>().toEqualTypeOf<true>();
  });
  test("customers.list", () => {
    expectTypeOf<Matches<SDK.CustomerListResponse, Res<"customers.list", 200>>>().toEqualTypeOf<true>();
  });
  test("customers.get", () => {
    expectTypeOf<Matches<SDK.Customer, Res<"customers.get", 200>>>().toEqualTypeOf<true>();
  });
  test("customers.update", () => {
    expectTypeOf<Matches<SDK.CustomerUpdateParams, Body<"customers.update">>>().toEqualTypeOf<true>();
    expectTypeOf<Matches<SDK.Customer, Res<"customers.update", 200>>>().toEqualTypeOf<true>();
  });
  test("customers.details", () => {
    expectTypeOf<Matches<SDK.CustomerDetails, Res<"customers.details", 200>>>().toEqualTypeOf<true>();
  });
  test("customers.conversations", () => {
    expectTypeOf<
      Matches<SDK.CustomerConversationListParams, Query<"customers.conversations">>
    >().toEqualTypeOf<true>();
    expectTypeOf<
      Matches<SDK.CustomerConversationListResponse, Res<"customers.conversations", 200>>
    >().toEqualTypeOf<true>();
  });
  test("customers.link", () => {
    expectTypeOf<Matches<SDK.CustomerLinkParams, Body<"customers.link">>>().toEqualTypeOf<true>();
    expectTypeOf<Matches<SDK.CustomerLink, Res<"customers.link", 201>>>().toEqualTypeOf<true>();
  });
  test("customers.link_get", () => {
    expectTypeOf<Matches<SDK.CustomerLinkLookupParams, Query<"customers.link_get">>>().toEqualTypeOf<true>();
    expectTypeOf<Matches<SDK.CustomerLinkListResponse, Res<"customers.link_get", 200>>>().toEqualTypeOf<true>();
  });
  test("customers.link_delete", () => {
    expectTypeOf<Matches<SDK.CustomerLinkLookupParams, Query<"customers.link_delete">>>().toEqualTypeOf<true>();
    expectTypeOf<
      Matches<SDK.CustomerLinkDeleteResponse, Res<"customers.link_delete", 200>>
    >().toEqualTypeOf<true>();
  });
  test("customers.link_batch", () => {
    expectTypeOf<Matches<SDK.CustomerLinkBatchParams, Body<"customers.link_batch">>>().toEqualTypeOf<true>();
    expectTypeOf<
      Matches<SDK.CustomerLinkBatchResponse, Res<"customers.link_batch", 200>>
    >().toEqualTypeOf<true>();
  });
});

describe("Conversations", () => {
  test("conversations.list", () => {
    expectTypeOf<Matches<SDK.ConversationListResponse, Res<"conversations.list", 200>>>().toEqualTypeOf<true>();
  });
  test("cases.list", () => {
    expectTypeOf<Matches<SDK.CaseListResponse, Res<"cases.list", 200>>>().toEqualTypeOf<true>();
  });
  test("conversations.get", () => {
    expectTypeOf<Matches<SDK.Conversation, Res<"conversations.get", 200>>>().toEqualTypeOf<true>();
  });
  test("conversations.events", () => {
    // The SDK also accepts arrays for event_type/include (joined to the documented CSV string).
    expectTypeOf<Assignable<Query<"conversations.events">, SDK.TranscriptParams>>().toEqualTypeOf<true>();
    expectTypeOf<SamePaths<SDK.TranscriptParams, Query<"conversations.events">>>().toEqualTypeOf<true>();
    expectTypeOf<Matches<SDK.TranscriptResponse, Res<"conversations.events", 200>>>().toEqualTypeOf<true>();
  });
});

describe("Knowledge Base", () => {
  test("kb.upload_file", () => {
    // Multipart body: field names are verified at runtime in contract.test.ts.
    expectTypeOf<Matches<SDK.KnowledgeBaseFile, Res<"kb.upload_file", 201>>>().toEqualTypeOf<true>();
  });
  test("kb.list_files", () => {
    expectTypeOf<Matches<SDK.KnowledgeBaseFileListParams, Query<"kb.list_files">>>().toEqualTypeOf<true>();
    expectTypeOf<Matches<SDK.KnowledgeBaseFileListResponse, Res<"kb.list_files", 200>>>().toEqualTypeOf<true>();
  });
  test("kb.search", () => {
    expectTypeOf<Matches<SDK.KnowledgeBaseSearchParams, Body<"kb.search">>>().toEqualTypeOf<true>();
    expectTypeOf<Matches<SDK.KnowledgeBaseSearchResponse, Res<"kb.search", 200>>>().toEqualTypeOf<true>();
  });
  test("kb.get_file", () => {
    expectTypeOf<Matches<SDK.KnowledgeBaseFile, Res<"kb.get_file", 200>>>().toEqualTypeOf<true>();
  });
  test("kb.delete_file", () => {
    expectTypeOf<Matches<SDK.SuccessResponse, Res<"kb.delete_file", 200>>>().toEqualTypeOf<true>();
  });
  test("kb.move_file", () => {
    expectTypeOf<Matches<SDK.KnowledgeBaseMoveFileParams, Body<"kb.move_file">>>().toEqualTypeOf<true>();
    expectTypeOf<Matches<SDK.SuccessResponse, Res<"kb.move_file", 200>>>().toEqualTypeOf<true>();
  });
  test("kb.list_folders", () => {
    expectTypeOf<Matches<SDK.KnowledgeBaseFolderListParams, Query<"kb.list_folders">>>().toEqualTypeOf<true>();
    expectTypeOf<
      Matches<SDK.KnowledgeBaseFolderListResponse, Res<"kb.list_folders", 200>>
    >().toEqualTypeOf<true>();
  });
  test("kb.create_folder", () => {
    expectTypeOf<Matches<SDK.KnowledgeBaseCreateFolderParams, Body<"kb.create_folder">>>().toEqualTypeOf<true>();
    expectTypeOf<Matches<SDK.KnowledgeBaseFolder, Res<"kb.create_folder", 201>>>().toEqualTypeOf<true>();
  });
  test("kb.update_folder", () => {
    expectTypeOf<Matches<SDK.KnowledgeBaseUpdateFolderParams, Body<"kb.update_folder">>>().toEqualTypeOf<true>();
    expectTypeOf<Matches<SDK.KnowledgeBaseFolder, Res<"kb.update_folder", 200>>>().toEqualTypeOf<true>();
  });
  test("kb.delete_folder", () => {
    expectTypeOf<
      Matches<SDK.KnowledgeBaseDeleteFolderResponse, Res<"kb.delete_folder", 200>>
    >().toEqualTypeOf<true>();
  });
});

describe("Credentials", () => {
  test("credentials.register", () => {
    expectTypeOf<Matches<SDK.CredentialRegisterParams, Body<"credentials.register">>>().toEqualTypeOf<true>();
    expectTypeOf<Matches<SDK.Credential, Res<"credentials.register", 201>>>().toEqualTypeOf<true>();
  });
  test("credentials.list", () => {
    expectTypeOf<Matches<SDK.CredentialListResponse, Res<"credentials.list", 200>>>().toEqualTypeOf<true>();
  });
  test("credentials.get", () => {
    expectTypeOf<Matches<SDK.Credential, Res<"credentials.get", 200>>>().toEqualTypeOf<true>();
  });
  test("credentials.resources", () => {
    expectTypeOf<
      Matches<SDK.CredentialResourceListResponse, Res<"credentials.resources", 200>>
    >().toEqualTypeOf<true>();
  });
});

describe("MCP Servers", () => {
  test("mcp_servers.register", () => {
    expectTypeOf<Matches<SDK.McpServerRegisterParams, Body<"mcp_servers.register">>>().toEqualTypeOf<true>();
    expectTypeOf<Matches<SDK.McpServer, Res<"mcp_servers.register", 201>>>().toEqualTypeOf<true>();
  });
  test("mcp_servers.list", () => {
    expectTypeOf<Matches<SDK.McpServerListResponse, Res<"mcp_servers.list", 200>>>().toEqualTypeOf<true>();
  });
  test("mcp_servers.update", () => {
    expectTypeOf<Matches<SDK.McpServerUpdateParams, Body<"mcp_servers.update">>>().toEqualTypeOf<true>();
    expectTypeOf<Matches<SDK.McpServer, Res<"mcp_servers.update", 200>>>().toEqualTypeOf<true>();
  });
  test("mcp_servers.get", () => {
    expectTypeOf<Matches<SDK.McpServer, Res<"mcp_servers.get", 200>>>().toEqualTypeOf<true>();
  });
});

describe("Analytics", () => {
  test("analytics.summary", () => {
    expectTypeOf<Matches<SDK.AnalyticsWindowParams, Query<"analytics.summary">>>().toEqualTypeOf<true>();
    expectTypeOf<Matches<SDK.AnalyticsSummary, Res<"analytics.summary", 200>>>().toEqualTypeOf<true>();
  });
  test("analytics.conversations_over_time", () => {
    expectTypeOf<
      Matches<SDK.AnalyticsWindowParams, Query<"analytics.conversations_over_time">>
    >().toEqualTypeOf<true>();
    expectTypeOf<
      Matches<SDK.ConversationsOverTimeResponse, Res<"analytics.conversations_over_time", 200>>
    >().toEqualTypeOf<true>();
  });
  test("analytics.channel_breakdown", () => {
    expectTypeOf<Matches<SDK.AnalyticsWindowParams, Query<"analytics.channel_breakdown">>>().toEqualTypeOf<true>();
    expectTypeOf<
      Matches<SDK.ChannelBreakdownResponse, Res<"analytics.channel_breakdown", 200>>
    >().toEqualTypeOf<true>();
  });
});

describe("Calls", () => {
  test("calls.list", () => {
    expectTypeOf<Matches<SDK.CallListParams, Query<"calls.list">>>().toEqualTypeOf<true>();
    expectTypeOf<Matches<SDK.CallListResponse, Res<"calls.list", 200>>>().toEqualTypeOf<true>();
  });
  test("calls.get", () => {
    expectTypeOf<Matches<SDK.Call, Res<"calls.get", 200>>>().toEqualTypeOf<true>();
  });
  test("calls.recordings", () => {
    expectTypeOf<Matches<SDK.CallRecordings, Res<"calls.recordings", 200>>>().toEqualTypeOf<true>();
  });
});

describe("Billing", () => {
  test("billing.credits", () => {
    expectTypeOf<Matches<SDK.CreditBalance, Res<"billing.credits", 200>>>().toEqualTypeOf<true>();
  });
  test("billing.usage", () => {
    expectTypeOf<Matches<SDK.AnalyticsWindowParams, Query<"billing.usage">>>().toEqualTypeOf<true>();
    expectTypeOf<Matches<SDK.TokenUsage, Res<"billing.usage", 200>>>().toEqualTypeOf<true>();
  });
});

describe("Outbound", () => {
  test("outbound.create", () => {
    expectTypeOf<Matches<SDK.OutboundCreateParams, Body<"outbound.create">>>().toEqualTypeOf<true>();
    expectTypeOf<Matches<SDK.OutboundCreateResponse, Res<"outbound.create", 201>>>().toEqualTypeOf<true>();
  });
});

describe("Messages", () => {
  test("messages.create", () => {
    // Narrowed on purpose to the documented "exactly one of" rules.
    expectTypeOf<NarrowerInput<SDK.MessageCreateParams, Body<"messages.create">>>().toEqualTypeOf<true>();
    expectTypeOf<Matches<SDK.MessageCreateResponse, Res<"messages.create", 201>>>().toEqualTypeOf<true>();
  });
  test("messages.list", () => {
    expectTypeOf<Matches<SDK.MessageListParams, Query<"messages.list">>>().toEqualTypeOf<true>();
    expectTypeOf<Matches<SDK.MessageListResponse, Res<"messages.list", 200>>>().toEqualTypeOf<true>();
  });
  test("messages.get", () => {
    expectTypeOf<Matches<SDK.Message, Res<"messages.get", 200>>>().toEqualTypeOf<true>();
  });
});

describe("Agents", () => {
  test("agents.create", () => {
    expectTypeOf<Matches<SDK.AgentCreateParams, Body<"agents.create">>>().toEqualTypeOf<true>();
    expectTypeOf<Matches<SDK.Agent, Res<"agents.create", 201>>>().toEqualTypeOf<true>();
  });
  test("agents.list", () => {
    expectTypeOf<Matches<SDK.AgentListResponse, Res<"agents.list", 200>>>().toEqualTypeOf<true>();
  });
  test("agents.get", () => {
    expectTypeOf<Matches<SDK.Agent, Res<"agents.get", 200>>>().toEqualTypeOf<true>();
  });
  test("agents.update", () => {
    expectTypeOf<Matches<SDK.AgentUpdateParams, Body<"agents.update">>>().toEqualTypeOf<true>();
    expectTypeOf<Matches<SDK.Agent, Res<"agents.update", 200>>>().toEqualTypeOf<true>();
  });
  test("agents.publish", () => {
    expectTypeOf<Matches<SDK.AgentPublishResponse, Res<"agents.publish", 200>>>().toEqualTypeOf<true>();
  });
  test("agents.create_from_spec", () => {
    expectTypeOf<
      Matches<SDK.AgentCreateFromSpecParams, Body<"agents.create_from_spec">>
    >().toEqualTypeOf<true>();
    expectTypeOf<Matches<SDK.AgentBuildResult, Res<"agents.create_from_spec", 200>>>().toEqualTypeOf<true>();
  });
  test("agents.generate", () => {
    expectTypeOf<Matches<SDK.AgentGenerateParams, Body<"agents.generate">>>().toEqualTypeOf<true>();
    expectTypeOf<Matches<SDK.AgentBuildResult, Res<"agents.generate", 200>>>().toEqualTypeOf<true>();
  });
});

describe("Support", () => {
  test("support.create_ticket", () => {
    expectTypeOf<Matches<SDK.SupportTicketCreateParams, Body<"support.create_ticket">>>().toEqualTypeOf<true>();
    expectTypeOf<Matches<SDK.SupportTicket, Res<"support.create_ticket", 201>>>().toEqualTypeOf<true>();
  });
  test("support.list_tickets", () => {
    expectTypeOf<Matches<SDK.SupportTicketListResponse, Res<"support.list_tickets", 200>>>().toEqualTypeOf<true>();
  });
  test("support.get_ticket", () => {
    expectTypeOf<Matches<SDK.SupportTicket, Res<"support.get_ticket", 200>>>().toEqualTypeOf<true>();
  });
  test("support.reply_ticket", () => {
    expectTypeOf<Matches<SDK.SupportTicketReplyParams, Body<"support.reply_ticket">>>().toEqualTypeOf<true>();
    expectTypeOf<
      Matches<SDK.SupportTicketReplyResponse, Res<"support.reply_ticket", 200>>
    >().toEqualTypeOf<true>();
  });
});

describe("Templates", () => {
  test("templates.sync", () => {
    expectTypeOf<Matches<SDK.TemplateSyncResponse, Res<"templates.sync", 200>>>().toEqualTypeOf<true>();
  });
  test("templates.list", () => {
    expectTypeOf<Matches<SDK.TemplateListParams, Query<"templates.list">>>().toEqualTypeOf<true>();
    expectTypeOf<Matches<SDK.TemplateListResponse, Res<"templates.list", 200>>>().toEqualTypeOf<true>();
  });
});

describe("checker sanity (negative controls)", () => {
  type Spec = Res<"customers.get", 200>;
  test("detects a missing optional field", () => {
    expectTypeOf<Matches<Omit<SDK.Customer, "tags">, Spec>>().toEqualTypeOf<false>();
  });
  test("detects an extra optional field", () => {
    expectTypeOf<Matches<SDK.Customer & { nickname?: string }, Spec>>().toEqualTypeOf<false>();
  });
  test("detects optional-vs-required drift", () => {
    expectTypeOf<Matches<Omit<SDK.Customer, "name"> & { name: string }, Spec>>().not.toEqualTypeOf<true>();
  });
  test("detects lost nullability", () => {
    type Wrong = Omit<SDK.CustomerStats, "last_active_at"> & { last_active_at: string };
    expectTypeOf<Matches<Wrong, Res<"customers.details", 200>["stats"]>>().not.toEqualTypeOf<true>();
  });
  test("detects enum drift", () => {
    type Wrong = Omit<SDK.Message, "kind"> & { kind: "text" | "sticker" };
    expectTypeOf<Matches<Wrong, Res<"messages.get", 200>>>().not.toEqualTypeOf<true>();
  });
  test("detects a nested extra field", () => {
    type Wrong = Omit<SDK.CustomerDetails, "stats"> & { stats: SDK.CustomerStats & { extra?: number } };
    expectTypeOf<Matches<Wrong, Res<"customers.details", 200>>>().toEqualTypeOf<false>();
  });
});

describe("Errors", () => {
  test("error envelope", () => {
    expectTypeOf<Matches<SDK.ApiErrorBody, Res<"customers.get", 404>>>().toEqualTypeOf<true>();
  });
});
