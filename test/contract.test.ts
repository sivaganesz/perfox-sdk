/**
 * Runtime contract test against the OpenAPI snapshot (spec/openapi.json).
 *
 * Every SDK method is invoked with every documented field populated, and the
 * outgoing request is checked against the spec:
 *  - every in-scope operation is exercised and no out-of-scope one is;
 *  - every public resource method is exercised;
 *  - HTTP method and path match (path params URL-encoded);
 *  - query keys are documented and, across invocations, every documented query param is sent;
 *  - JSON bodies validate against the spec schema (required, enums, bounds,
 *    additionalProperties: false) and, across invocations, every documented body field is sent;
 *  - multipart bodies carry exactly the documented fields.
 */
import { readFileSync } from "node:fs";
import { Ajv, type ValidateFunction } from "ajv";
import { beforeAll, describe, expect, test } from "vitest";
import type { PerfoxClient } from "../src/index.js";
import { createTestClient, json, type RecordedRequest } from "./helpers.js";

const IN_SCOPE_TAGS = [
  "Customers",
  "Conversations",
  "Knowledge Base",
  "Credentials",
  "MCP Servers",
  "Analytics",
  "Calls",
  "Billing",
  "Outbound",
  "Messages",
  "Agents",
];

/** Operations the spec documents under IN_SCOPE_TAGS (guards against silent spec changes). */
const EXPECTED_OPERATION_COUNT = 51;

interface SchemaNode {
  type?: string;
  properties?: Record<string, SchemaNode>;
  items?: SchemaNode;
  required?: string[];
  [key: string]: unknown;
}

interface SpecOperation {
  operationId: string;
  tags: string[];
  parameters?: Array<{ in: string; name: string; required?: boolean }>;
  requestBody?: { content: Record<string, { schema: SchemaNode }> };
  responses: Record<string, unknown>;
}

const spec = JSON.parse(readFileSync(new URL("../spec/openapi.json", import.meta.url), "utf8")) as {
  paths: Record<string, Record<string, SpecOperation>>;
};

interface Op {
  method: string;
  path: string;
  op: SpecOperation;
}

const allOps = new Map<string, Op>();
for (const [path, item] of Object.entries(spec.paths)) {
  for (const [method, op] of Object.entries(item)) {
    allOps.set(op.operationId, { method: method.toUpperCase(), path, op });
  }
}
const inScopeOps = [...allOps.entries()].filter(([, o]) => IN_SCOPE_TAGS.includes(o.op.tags[0] ?? ""));

/** An id that needs URL encoding, to prove path params are encoded. */
const ID = "id 1/é?x";

const TEMPLATE = {
  name: "order_update",
  language: "en_US",
  body_parameters: ["Asha", "#123"],
  header: { type: "image" as const, text: "Header", url: "https://cdn.example.com/a.png" },
  buttons: [{ sub_type: "url" as const, index: 0, payload: "p", text: "track/123" }],
};

const CUSTOMER_FIELDS = {
  name: "Asha",
  phone: "+91 98765 43210",
  email: "asha@example.com",
  external_id: "user-42",
  attributes: { plan_tier: "gold" },
  preferred_language: "en",
  tags: ["vip"],
};

const LINK = {
  external_id: "user-42",
  identifiers: { email: "asha@example.com", mobile: "+919876543210", name: "Asha" },
};

const WINDOW = { days: 30, start_date: "2026-01-01", end_date: "2026-01-31", interval: "week" as const };

const MCP_FIELDS = {
  name: "Orders",
  description: "Order tools",
  url: "https://mcp.example.com/sse",
  transport: "sse" as const,
  auth_type: "bearer" as const,
  auth_header_name: "Authorization",
  auth_secret: "s3cret",
  config: { rate_limit: 10, timeout_ms: 5000, cache_ttl_s: 0 },
  oversized_result_policy: "trim" as const,
};

/** A two-node graph that populates every documented node and edge field. */
const AGENT_GRAPH = {
  nodes: [
    {
      id: "n1",
      type: "trigger" as const,
      label: "Web trigger",
      position: { x: 0, y: 0 },
      config: { channel: "web" },
      description: "Entry point",
      retry: { max_attempts: 3, backoff_ms: 500 },
      timeout_ms: 30_000,
      notes: "Fires on every new chat",
      pinned_input: { sample: true },
    },
    { id: "n2", type: "ai_agent" as const, label: "Agent", position: { x: 200, y: 0 }, config: {} },
  ],
  edges: [
    {
      id: "e1",
      source: "n1",
      target: "n2",
      source_handle: "out",
      target_handle: "in",
      label: "next",
      condition: "true",
      connection_type: "flow" as const,
    },
  ],
};

type Invocation = { method: string; run: (c: PerfoxClient) => Promise<unknown> };

/** opId -> invocations that together populate every documented field. */
const INVOCATIONS: Record<string, Invocation[]> = {
  // Customers
  "customers.create": [{ method: "customers.create", run: (c) => c.customers.create(CUSTOMER_FIELDS) }],
  "customers.list": [{ method: "customers.list", run: (c) => c.customers.list() }],
  "customers.get": [{ method: "customers.get", run: (c) => c.customers.get(ID) }],
  "customers.update": [{ method: "customers.update", run: (c) => c.customers.update(ID, CUSTOMER_FIELDS) }],
  "customers.details": [{ method: "customers.getDetails", run: (c) => c.customers.getDetails(ID) }],
  "customers.conversations": [
    {
      method: "customers.listConversations",
      run: (c) => c.customers.listConversations(ID, { status: "ended", limit: 50, cursor: "cur" }),
    },
    {
      method: "customers.iterateConversations",
      run: (c) => c.customers.iterateConversations(ID, { status: "active", limit: 10 }).toArray(),
    },
  ],
  "customers.link": [{ method: "customers.link", run: (c) => c.customers.link(LINK) }],
  "customers.link_get": [{ method: "customers.getLinks", run: (c) => c.customers.getLinks({ external_id: "user-42" }) }],
  "customers.link_delete": [
    { method: "customers.deleteLinks", run: (c) => c.customers.deleteLinks({ external_id: "user-42" }) },
  ],
  "customers.link_batch": [{ method: "customers.linkBatch", run: (c) => c.customers.linkBatch({ links: [LINK] }) }],

  // Conversations
  "conversations.list": [{ method: "conversations.list", run: (c) => c.conversations.list() }],
  "cases.list": [{ method: "conversations.listCases", run: (c) => c.conversations.listCases() }],
  "conversations.get": [{ method: "conversations.get", run: (c) => c.conversations.get(ID) }],
  "conversations.events": [
    {
      method: "conversations.getTranscript",
      run: (c) =>
        c.conversations.getTranscript(ID, {
          limit: 100,
          after: "2026-01-01T00:00:00Z",
          before: "2026-02-01T00:00:00Z",
          event_type: ["user_message", "ai_response"],
          include: ["tool_io", "delivery"],
        }),
    },
    {
      method: "conversations.iterateTranscript",
      run: (c) => c.conversations.iterateTranscript(ID, { include: "files" }).toArray(),
    },
  ],

  // Knowledge Base
  "kb.upload_file": [
    {
      method: "knowledgeBase.uploadFile",
      run: (c) =>
        c.knowledgeBase.uploadFile({
          file: { data: new Uint8Array([37, 80, 68, 70]), filename: "guide.pdf", contentType: "application/pdf" },
          name: "Guide",
          folder_id: "fld_1",
        }),
    },
  ],
  "kb.list_files": [
    {
      method: "knowledgeBase.listFiles",
      run: (c) => c.knowledgeBase.listFiles({ folder_id: "fld_1", status: "indexed", limit: 20, cursor: "cur" }),
    },
    { method: "knowledgeBase.iterateFiles", run: (c) => c.knowledgeBase.iterateFiles().toArray() },
  ],
  "kb.search": [
    {
      method: "knowledgeBase.search",
      run: (c) => c.knowledgeBase.search({ query: "refund policy", kb_id: "kb_1", folder_id: "fld_1", top_k: 5 }),
    },
  ],
  "kb.get_file": [{ method: "knowledgeBase.getFile", run: (c) => c.knowledgeBase.getFile(ID) }],
  "kb.delete_file": [{ method: "knowledgeBase.deleteFile", run: (c) => c.knowledgeBase.deleteFile(ID) }],
  "kb.move_file": [
    { method: "knowledgeBase.moveFile", run: (c) => c.knowledgeBase.moveFile(ID, { folder_id: "fld_2" }) },
    { method: "knowledgeBase.moveFile", run: (c) => c.knowledgeBase.moveFile(ID, { folder_id: null }) },
  ],
  "kb.list_folders": [
    { method: "knowledgeBase.listFolders", run: (c) => c.knowledgeBase.listFolders({ parent_id: "fld_1" }) },
  ],
  "kb.create_folder": [
    {
      method: "knowledgeBase.createFolder",
      run: (c) => c.knowledgeBase.createFolder({ name: "Policies", parent_id: null }),
    },
  ],
  "kb.update_folder": [
    { method: "knowledgeBase.updateFolder", run: (c) => c.knowledgeBase.updateFolder(ID, { name: "Renamed" }) },
  ],
  "kb.delete_folder": [{ method: "knowledgeBase.deleteFolder", run: (c) => c.knowledgeBase.deleteFolder(ID) }],

  // Credentials
  "credentials.register": [
    {
      method: "credentials.register",
      run: (c) =>
        c.credentials.register({
          name: "Plivo prod",
          type: "plivo",
          description: "Main numbers",
          config: { auth_id: "MA123", auth_token: "secret" },
        }),
    },
  ],
  "credentials.list": [{ method: "credentials.list", run: (c) => c.credentials.list() }],
  "credentials.get": [{ method: "credentials.get", run: (c) => c.credentials.get(ID) }],
  "credentials.resources": [{ method: "credentials.listResources", run: (c) => c.credentials.listResources(ID) }],

  // MCP Servers
  "mcp_servers.register": [
    {
      method: "mcpServers.register",
      run: (c) => c.mcpServers.register({ ...MCP_FIELDS, credential_ref: "cred_1" }),
    },
  ],
  "mcp_servers.list": [{ method: "mcpServers.list", run: (c) => c.mcpServers.list() }],
  "mcp_servers.update": [{ method: "mcpServers.update", run: (c) => c.mcpServers.update(ID, MCP_FIELDS) }],
  "mcp_servers.get": [{ method: "mcpServers.get", run: (c) => c.mcpServers.get(ID) }],

  // Analytics
  "analytics.summary": [{ method: "analytics.getSummary", run: (c) => c.analytics.getSummary(WINDOW) }],
  "analytics.conversations_over_time": [
    { method: "analytics.getConversationsOverTime", run: (c) => c.analytics.getConversationsOverTime(WINDOW) },
  ],
  "analytics.channel_breakdown": [
    { method: "analytics.getChannelBreakdown", run: (c) => c.analytics.getChannelBreakdown(WINDOW) },
  ],

  // Calls
  "calls.list": [
    {
      method: "calls.list",
      run: (c) =>
        c.calls.list({ limit: 25, cursor: "cur", status: "completed", start_date: "2026-01-01", end_date: "2026-01-31" }),
    },
    { method: "calls.iterate", run: (c) => c.calls.iterate({ limit: 5 }).toArray() },
  ],
  "calls.get": [{ method: "calls.get", run: (c) => c.calls.get(ID) }],
  "calls.recordings": [{ method: "calls.getRecordings", run: (c) => c.calls.getRecordings(ID) }],

  // Billing
  "billing.credits": [{ method: "billing.getCredits", run: (c) => c.billing.getCredits() }],
  "billing.usage": [{ method: "billing.getUsage", run: (c) => c.billing.getUsage(WINDOW) }],

  // Outbound
  "outbound.create": [
    {
      method: "outbound.create",
      run: (c) =>
        c.outbound.create({
          agent_id: "agt_1",
          channel: "whatsapp",
          to: "+919876543210",
          opening_message: "Hi!",
          customer_id: "cus_1",
          template: TEMPLATE,
        }),
    },
  ],

  // Messages
  "messages.create": [
    {
      method: "messages.create",
      run: (c) =>
        c.messages.create({ channel: "whatsapp", to: "+919876543210", from: "+911234567890", text: "Hi", customer_id: "cus_1" }),
    },
    {
      method: "messages.create",
      run: (c) =>
        c.messages.create({
          to: "+919876543210",
          agent_id: "agt_1",
          media: { type: "document", url: "https://cdn.example.com/a.pdf", caption: "Invoice", filename: "a.pdf" },
        }),
    },
    {
      method: "messages.create",
      run: (c) =>
        c.messages.create({
          to: "+919876543210",
          agent_id: "agt_1",
          location: { latitude: 12.97, longitude: 77.59, name: "Office", address: "MG Road" },
        }),
    },
    {
      method: "messages.create",
      run: (c) => c.messages.create({ to: "+919876543210", from: "+911234567890", template: TEMPLATE }),
    },
  ],
  "messages.list": [
    {
      method: "messages.list",
      run: (c) =>
        c.messages.list({
          to: "+919876543210",
          from: "+911234567890",
          status: "delivered",
          since: "2026-01-01T00:00:00Z",
          until: "2026-02-01T00:00:00Z",
          limit: 50,
          cursor: "cur",
        }),
    },
    { method: "messages.iterate", run: (c) => c.messages.iterate({ status: "failed" }).toArray() },
  ],
  "messages.get": [{ method: "messages.get", run: (c) => c.messages.get(ID) }],

  // Agents
  "agents.create": [
    {
      method: "agents.create",
      run: (c) => c.agents.create({ name: "Support", description: "Helps customers", channels: ["web"], ...AGENT_GRAPH }),
    },
  ],
  "agents.list": [{ method: "agents.list", run: (c) => c.agents.list() }],
  "agents.get": [{ method: "agents.get", run: (c) => c.agents.get(ID) }],
  "agents.update": [
    {
      method: "agents.update",
      run: (c) =>
        c.agents.update(ID, {
          name: "Support v2",
          description: "Updated",
          channels: ["web", "whatsapp"],
          status: "testing",
          ...AGENT_GRAPH,
        }),
    },
  ],
  "agents.publish": [{ method: "agents.publish", run: (c) => c.agents.publish(ID) }],
  "agents.create_from_spec": [
    {
      method: "agents.createFromSpec",
      run: (c) =>
        c.agents.createFromSpec({
          name: "Maya",
          persona_name: "Maya",
          role: "Support Agent",
          tone: "friendly",
          system_prompt: "You help customers with orders.",
          greeting: "Hi, I'm Maya!",
          channel: "whatsapp",
          chat_model_credential_id: "cred_llm",
          publish: false,
        }),
    },
  ],
  "agents.generate": [
    {
      method: "agents.generate",
      run: (c) =>
        c.agents.generate({
          prompt: "A friendly agent that tracks orders",
          channel: "web",
          chat_model_credential_id: "cred_llm",
          publish: true,
        }),
    },
  ],
};

// ---------------------------------------------------------------- helpers

/** Converts OpenAPI 3.0-style boolean exclusiveMinimum into the JSON Schema form Ajv expects. */
function normalizeSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(normalizeSchema);
  if (!node || typeof node !== "object") return node;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node)) out[k] = normalizeSchema(v);
  if (out.exclusiveMinimum === true) {
    out.exclusiveMinimum = out.minimum;
    delete out.minimum;
  }
  return out;
}

/** All property paths of a schema (array items share their parent path). */
function schemaPaths(schema: SchemaNode | undefined, prefix = ""): string[] {
  if (!schema) return [];
  const target = schema.type === "array" ? schema.items : schema;
  if (!target?.properties) return [];
  return Object.entries(target.properties).flatMap(([k, v]) => [`${prefix}${k}`, ...schemaPaths(v, `${prefix}${k}.`)]);
}

/**
 * Documented property paths present in a JSON value, walked alongside the schema
 * (free-form maps such as `attributes` have no documented inner properties).
 */
function coveredPaths(value: unknown, schema: SchemaNode | undefined, prefix = ""): string[] {
  if (Array.isArray(value)) return value.flatMap((v) => coveredPaths(v, schema?.items, prefix));
  if (!value || typeof value !== "object" || !schema?.properties) return [];
  return Object.entries(value).flatMap(([k, v]) => {
    const child = schema.properties?.[k];
    return child ? [`${prefix}${k}`, ...coveredPaths(v, child, `${prefix}${k}.`)] : [];
  });
}

function expectedPath(template: string): string {
  return new URL(`https://x${template.replace(/\{[^}]+\}/g, encodeURIComponent(ID))}`).pathname;
}

function successStatus(op: SpecOperation): number {
  return Number(Object.keys(op.responses).find((c) => c.startsWith("2")) ?? 200);
}

// ---------------------------------------------------------------- tests

describe("spec coverage", () => {
  test("snapshot has the expected in-scope operations", () => {
    expect(inScopeOps).toHaveLength(EXPECTED_OPERATION_COUNT);
  });

  test("every in-scope operation has SDK invocations, and nothing else does", () => {
    expect(Object.keys(INVOCATIONS).sort()).toEqual(inScopeOps.map(([id]) => id).sort());
  });

  test("every public resource method is exercised", async () => {
    const { client } = createTestClient();
    const resources = [
      "customers",
      "conversations",
      "knowledgeBase",
      "credentials",
      "mcpServers",
      "analytics",
      "calls",
      "billing",
      "outbound",
      "messages",
      "agents",
    ] as const;
    const publicMethods = resources.flatMap((name) => {
      const proto = Object.getPrototypeOf(client[name]) as object;
      return Object.getOwnPropertyNames(proto)
        .filter((m) => m !== "constructor" && !m.startsWith("_"))
        .map((m) => `${name}.${m}`);
    });
    const exercised = new Set(Object.values(INVOCATIONS).flatMap((list) => list.map((i) => i.method)));
    expect([...exercised].sort()).toEqual([...new Set(publicMethods)].sort());
  });
});

describe.each(inScopeOps)("%s", (opId, { method, path, op }) => {
  const invocations = INVOCATIONS[opId] ?? [];
  const recorded: RecordedRequest[] = [];
  let validate: ValidateFunction | undefined;
  const jsonSchema = op.requestBody?.content["application/json"]?.schema;
  const multipartSchema = op.requestBody?.content["multipart/form-data"]?.schema;

  beforeAll(async () => {
    if (jsonSchema) {
      const ajv = new Ajv({ strict: false, allErrors: true, validateFormats: false });
      validate = ajv.compile(normalizeSchema(jsonSchema) as object);
    }
    for (const invocation of invocations) {
      // Shaped as a single, final page for every pagination style.
      const { client, requests } = createTestClient(() =>
        json({ data: [], messages: [], conversations: [] }, successStatus(op)),
      );
      await invocation.run(client);
      recorded.push(...requests);
    }
  });

  test(`sends ${method} ${path}`, () => {
    expect(recorded.length).toBeGreaterThan(0);
    for (const req of recorded) {
      expect(req.method).toBe(method);
      expect(req.url.origin + req.url.pathname).toBe(
        "https://acme-api.perfox.ai" + expectedPath(`/api/v1${path}`),
      );
    }
  });

  test("query parameters are documented, required ones present, all documented ones covered", () => {
    const documented = (op.parameters ?? []).filter((p) => p.in === "query");
    const allowed = new Set(documented.map((p) => p.name));
    const sent = new Set<string>();
    for (const req of recorded) {
      for (const key of req.url.searchParams.keys()) {
        expect(allowed, `undocumented query param "${key}"`).toContain(key);
        sent.add(key);
      }
      for (const p of documented.filter((d) => d.required)) {
        expect(req.url.searchParams.get(p.name), `required query param "${p.name}"`).toBeTruthy();
      }
    }
    expect([...sent].sort()).toEqual([...allowed].sort());
  });

  if (jsonSchema) {
    test("JSON body validates against the spec and covers every documented field", () => {
      const covered = new Set<string>();
      for (const req of recorded) {
        expect(req.headers.get("content-type")).toBe("application/json");
        const body = JSON.parse(String(req.body)) as unknown;
        const ok = validate?.(body);
        expect(ok, JSON.stringify(validate?.errors, null, 2)).toBe(true);
        coveredPaths(body, jsonSchema).forEach((p) => covered.add(p));
      }
      const documented = schemaPaths(jsonSchema);
      const missing = documented.filter((p) => !covered.has(p));
      expect(missing, "documented body fields never sent").toEqual([]);
    });
  } else if (multipartSchema) {
    test("multipart body carries exactly the documented fields", () => {
      for (const req of recorded) {
        expect(req.body).toBeInstanceOf(FormData);
        expect(req.headers.has("content-type")).toBe(false); // fetch sets the boundary
        const form = req.body as FormData;
        const fields = [...new Set([...form.keys()])].sort();
        expect(fields).toEqual(Object.keys(multipartSchema.properties ?? {}).sort());
        const file = form.get("file");
        expect(file).toBeInstanceOf(Blob);
        expect((file as File).name).toBe("guide.pdf");
        expect((file as File).type).toBe("application/pdf");
      }
    });
  } else {
    test("sends no body", () => {
      for (const req of recorded) expect(req.body).toBeUndefined();
    });
  }
});
