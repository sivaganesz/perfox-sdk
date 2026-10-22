import type { ISODateTime, JsonObject, OpenEnum } from "../../types/common.js";

/** Channels an agent can serve. */
export type AgentChannel = "whatsapp" | "phone" | "web" | "sms" | "email" | "mobile" | "heartbeat";

/** `draft | testing | published | archived | paused`. */
export type AgentStatus = OpenEnum<"draft" | "testing" | "published" | "archived" | "paused">;

/** Node types accepted in an agent graph. */
export type AgentNodeType =
  | "trigger"
  | "ai_agent"
  | "agent_graph"
  | "logic"
  | "human"
  | "entity"
  | "data"
  | "analytics"
  | "http_request"
  | "document_processing"
  | "kb_indexer"
  | "workflow"
  | "render_view"
  | "agent_step"
  | "tool_step"
  | "sticky_note"
  | "chat_model"
  | "workflow_tool"
  | "pdf_creator"
  | "csv_creator"
  | "report_creator"
  | "email_sender"
  | "sms_sender"
  | "whatsapp_sender"
  | "human_escalator"
  | "phone_caller"
  | "http_requester"
  | "document_uploader"
  | "google_sheets_appender"
  | "google_sheets_read"
  | "db_query"
  | "mysql_query"
  | "mongodb_query"
  | "document_extractor"
  | "mcp_server"
  | "persona"
  | "knowledge_base"
  | "operator";

/** How an edge connects two nodes. Sub-nodes link via `ai_persona` / `ai_chat_model`. */
export type AgentConnectionType =
  | "flow"
  | "ai_chat_model"
  | "ai_tool"
  | "ai_mcp_server"
  | "ai_output_parser"
  | "ai_persona"
  | "ai_knowledge_base"
  | "ai_operator"
  | "agent_graph_workers";

/** A node in an agent graph. */
export interface AgentNode {
  id: string;
  type: AgentNodeType;
  label: string;
  position: { x: number; y: number };
  /** Node-type-specific settings. */
  config: JsonObject;
  description?: string;
  retry?: {
    /** 1–10. */
    max_attempts: number;
    /** ≥ 0. */
    backoff_ms: number;
  };
  /** Integer > 0. */
  timeout_ms?: number;
  notes?: string;
  /** Any JSON value. */
  pinned_input?: unknown;
}

/** A typed edge in an agent graph. */
export interface AgentEdge {
  id: string;
  source: string;
  target: string;
  source_handle?: string;
  target_handle?: string;
  label?: string;
  condition?: string;
  connection_type?: AgentConnectionType;
}

/** An agent as returned by `GET /agents` (without its graph). */
export interface AgentSummary {
  id: string;
  name: string;
  description: string;
  status: AgentStatus;
  /**
   * The channels this agent serves — one per trigger node on its canvas.
   * Empty for a webhook- or schedule-only agent.
   */
  channels: string[];
  active_version: number;
  node_count: number;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

/** An agent with its node/edge graph. */
export interface Agent extends AgentSummary {
  nodes: AgentNode[];
  edges: AgentEdge[];
}

/** Response of `GET /agents`. */
export interface AgentListResponse {
  data: AgentSummary[];
}

/** Body of `POST /agents`. */
export interface AgentCreateParams {
  /** 1–200 characters. */
  name: string;
  /** Default `""`. */
  description?: string;
  /** At least one channel, e.g. `["web"]`. */
  channels: AgentChannel[];
  /** Full node graph (trigger + ai_agent + persona + chat_model sub-nodes). Omit to fill in later via update. */
  nodes?: AgentNode[];
  edges?: AgentEdge[];
}

/** Body of `PATCH /agents/{id}`. Sending `nodes`/`edges` replaces the graph. */
export interface AgentUpdateParams {
  /** 1–200 characters. */
  name?: string;
  description?: string;
  /** At least one channel when sent. */
  channels?: AgentChannel[];
  nodes?: AgentNode[];
  edges?: AgentEdge[];
  /** Non-live state transitions only; use `agents.publish` to go live. */
  status?: "draft" | "testing" | "archived" | "paused";
}

/** Response of `POST /agents/{id}/publish`. */
export interface AgentPublishResponse {
  id: string;
  status: "published";
  /** The version snapshot that went live. */
  version: number;
}

/** Body of `POST /agents/from-spec`. */
export interface AgentCreateFromSpecParams {
  /** Agent display name. 1–200 characters. */
  name: string;
  /** Persona first name, e.g. "Maya". */
  persona_name: string;
  /** Persona role line, e.g. "Support Agent". */
  role: string;
  /** `professional | friendly | empathetic | casual | authoritative`. */
  tone?: OpenEnum<"professional" | "friendly" | "empathetic" | "casual" | "authoritative">;
  /** The full system prompt (persona behaviour + skills). */
  system_prompt: string;
  greeting?: string;
  /** Channel the agent serves (defaults to web). */
  channel?: AgentChannel;
  /** Tenant Gemini/OpenAI credential id for the agent LLM. */
  chat_model_credential_id?: string;
  /** Publish immediately (requires the `workflows:publish` scope). */
  publish?: boolean;
}

/** Body of `POST /agents/generate`. */
export interface AgentGenerateParams {
  /** Plain-language description of the agent to build. */
  prompt: string;
  channel?: AgentChannel;
  chat_model_credential_id?: string;
  /** Publish immediately (requires the `workflows:publish` scope). */
  publish?: boolean;
}

/** Response of `POST /agents/from-spec` and `POST /agents/generate`. */
export interface AgentBuildResult {
  id: string;
  name: string;
  /** `draft | published`. */
  status: OpenEnum<"draft" | "published">;
  channels: string[];
  node_count: number;
  published: boolean;
  /** Present when the agent was published. */
  version?: number;
}
