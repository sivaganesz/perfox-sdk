#!/usr/bin/env node
/**
 * Generates docs/endpoint-inventory.md from the OpenAPI snapshot in spec/openapi.json.
 *
 * Everything contract-related (methods, paths, params, bodies, responses, scopes,
 * enums, nullability, constraints) is read straight from the spec. The only
 * hand-maintained data here is SDK_MAPPING: which SDK method implements each
 * operation, how it paginates, and whether the SDK retries it automatically.
 *
 * Usage: node scripts/generate-inventory.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const spec = JSON.parse(readFileSync(join(root, "spec/openapi.json"), "utf8"));

export const IN_SCOPE_TAGS = [
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

/** operationId -> SDK mapping. pagination: none | cursor | after | page-meta. */
const SDK_MAPPING = {
  "customers.create": { sdk: "customers.create", pagination: "none", retry: "yes (documented idempotent on identity)" },
  "customers.list": { sdk: "customers.list", pagination: "none", retry: "yes (GET)" },
  "customers.get": { sdk: "customers.get", pagination: "none", retry: "yes (GET)" },
  "customers.update": { sdk: "customers.update", pagination: "none", retry: "no (opt-in)" },
  "customers.details": { sdk: "customers.getDetails", pagination: "none", retry: "yes (GET)" },
  "customers.conversations": { sdk: "customers.listConversations / customers.iterateConversations", pagination: "cursor", retry: "yes (GET)" },
  "customers.link": { sdk: "customers.link", pagination: "none", retry: "yes (documented idempotent)" },
  "customers.link_get": { sdk: "customers.getLinks", pagination: "none", retry: "yes (GET)" },
  "customers.link_delete": { sdk: "customers.deleteLinks", pagination: "none", retry: "yes (DELETE)" },
  "customers.link_batch": { sdk: "customers.linkBatch", pagination: "none", retry: "yes (each item documented idempotent)" },
  "conversations.list": { sdk: "conversations.list", pagination: "none", retry: "yes (GET)" },
  "cases.list": { sdk: "conversations.listCases", pagination: "page-meta", retry: "yes (GET)" },
  "conversations.get": { sdk: "conversations.get", pagination: "none", retry: "yes (GET)" },
  "conversations.events": { sdk: "conversations.getTranscript / conversations.iterateTranscript", pagination: "after", retry: "yes (GET)" },
  "kb.upload_file": { sdk: "knowledgeBase.uploadFile", pagination: "none", retry: "no (opt-in)" },
  "kb.list_files": { sdk: "knowledgeBase.listFiles / knowledgeBase.iterateFiles", pagination: "cursor", retry: "yes (GET)" },
  "kb.search": { sdk: "knowledgeBase.search", pagination: "none", retry: "yes (read-only POST)" },
  "kb.get_file": { sdk: "knowledgeBase.getFile", pagination: "none", retry: "yes (GET)" },
  "kb.delete_file": { sdk: "knowledgeBase.deleteFile", pagination: "none", retry: "yes (DELETE)" },
  "kb.move_file": { sdk: "knowledgeBase.moveFile", pagination: "none", retry: "no (opt-in)" },
  "kb.list_folders": { sdk: "knowledgeBase.listFolders", pagination: "none", retry: "yes (GET)" },
  "kb.create_folder": { sdk: "knowledgeBase.createFolder", pagination: "none", retry: "no (opt-in)" },
  "kb.update_folder": { sdk: "knowledgeBase.updateFolder", pagination: "none", retry: "no (opt-in)" },
  "kb.delete_folder": { sdk: "knowledgeBase.deleteFolder", pagination: "none", retry: "yes (DELETE)" },
  "credentials.register": { sdk: "credentials.register", pagination: "none", retry: "no (opt-in)" },
  "credentials.list": { sdk: "credentials.list", pagination: "none", retry: "yes (GET)" },
  "credentials.get": { sdk: "credentials.get", pagination: "none", retry: "yes (GET)" },
  "credentials.resources": { sdk: "credentials.listResources", pagination: "none", retry: "yes (GET)" },
  "mcp_servers.register": { sdk: "mcpServers.register", pagination: "none", retry: "no (opt-in)" },
  "mcp_servers.list": { sdk: "mcpServers.list", pagination: "none", retry: "yes (GET)" },
  "mcp_servers.update": { sdk: "mcpServers.update", pagination: "none", retry: "no (opt-in)" },
  "mcp_servers.get": { sdk: "mcpServers.get", pagination: "none", retry: "yes (GET)" },
  "analytics.summary": { sdk: "analytics.getSummary", pagination: "none", retry: "yes (GET)" },
  "analytics.conversations_over_time": { sdk: "analytics.getConversationsOverTime", pagination: "none", retry: "yes (GET)" },
  "analytics.channel_breakdown": { sdk: "analytics.getChannelBreakdown", pagination: "none", retry: "yes (GET)" },
  "calls.list": { sdk: "calls.list / calls.iterate", pagination: "cursor", retry: "yes (GET)" },
  "calls.get": { sdk: "calls.get", pagination: "none", retry: "yes (GET)" },
  "calls.recordings": { sdk: "calls.getRecordings", pagination: "none", retry: "yes (GET)" },
  "billing.credits": { sdk: "billing.getCredits", pagination: "none", retry: "yes (GET)" },
  "billing.usage": { sdk: "billing.getUsage", pagination: "none", retry: "yes (GET)" },
  "outbound.create": { sdk: "outbound.create", pagination: "none", retry: "no (opt-in) — would start a second conversation / send twice" },
  "messages.create": { sdk: "messages.create", pagination: "none", retry: "no (opt-in) — would send twice" },
  "messages.list": { sdk: "messages.list / messages.iterate", pagination: "cursor", retry: "yes (GET)" },
  "messages.get": { sdk: "messages.get", pagination: "none", retry: "yes (GET)" },
  "agents.create": { sdk: "agents.create", pagination: "none", retry: "no (opt-in) — would create a second agent" },
  "agents.list": { sdk: "agents.list", pagination: "none", retry: "yes (GET)" },
  "agents.get": { sdk: "agents.get", pagination: "none", retry: "yes (GET)" },
  "agents.update": { sdk: "agents.update", pagination: "none", retry: "no (opt-in)" },
  "agents.publish": { sdk: "agents.publish", pagination: "none", retry: "no (opt-in) — each publish snapshots a new version" },
  "agents.create_from_spec": { sdk: "agents.createFromSpec", pagination: "none", retry: "no (opt-in) — would create a second agent" },
  "agents.generate": { sdk: "agents.generate", pagination: "none", retry: "no (opt-in) — would create a second agent and re-run the LLM" },
};

const PAGINATION_TEXT = {
  none: "None documented — single response.",
  cursor: "Opaque cursor: send `limit` + `cursor`; response `next_cursor` (absent on the last page).",
  after: "Timestamp cursor: send `limit` + `after`; response `next_after` + `has_more`.",
  "page-meta": "Response carries `pagination {page, page_size, total, total_pages}` but NO request parameter to choose a page is documented.",
};

const esc = (s) => String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");

function constraints(x) {
  const out = [];
  if (x.format) out.push(`format: ${x.format}`);
  if (x.enum) out.push(`enum: ${x.enum.map((v) => "`" + JSON.stringify(v) + "`").join(", ")}`);
  if (x.default !== undefined) out.push(`default: ${JSON.stringify(x.default)}`);
  if (x.minimum !== undefined) out.push(`${x.exclusiveMinimum === true ? ">" : "≥"} ${x.minimum}`);
  if (x.maximum !== undefined) out.push(`≤ ${x.maximum}`);
  if (x.minLength !== undefined) out.push(`minLength ${x.minLength}`);
  if (x.maxLength !== undefined) out.push(`maxLength ${x.maxLength}`);
  if (x.minItems !== undefined) out.push(`minItems ${x.minItems}`);
  if (x.maxItems !== undefined) out.push(`maxItems ${x.maxItems}`);
  return out;
}

function typeOf(x) {
  if (!x) return "any";
  if (x.anyOf) return x.anyOf.map(typeOf).join(" \\| ");
  if (x.type === "array") return `${typeOf(x.items)}[]`;
  if (x.type === "object" || x.properties) {
    if (!x.properties && x.additionalProperties && typeof x.additionalProperties === "object") {
      return `map<string, ${typeOf(x.additionalProperties)}>`;
    }
    return "object";
  }
  return x.type || "any";
}

/** Flatten a schema into rows: [path, type, required, nullable, constraints, description]. */
function flatten(schema, prefix = "", rows = []) {
  if (!schema) return rows;
  const target = schema.type === "array" ? schema.items : schema;
  if (!target || !target.properties) return rows;
  const req = new Set(target.required || []);
  for (const [k, v] of Object.entries(target.properties)) {
    const p = prefix + k;
    rows.push([p, typeOf(v), req.has(k), v.nullable === true, constraints(v), v.description || ""]);
    const inner = v.type === "array" ? v.items : v;
    if (inner && inner.properties) flatten(inner, p + (v.type === "array" ? "[]." : "."), rows);
  }
  return rows;
}

function fieldTable(rows) {
  if (!rows.length) return "_No fields._\n";
  let t = "| Field | Type | Required | Nullable | Constraints | Description |\n|---|---|---|---|---|---|\n";
  for (const [p, ty, r, n, c, d] of rows) {
    t += `| \`${p}\` | ${ty} | ${r ? "yes" : "no"} | ${n ? "yes" : "no"} | ${esc(c.join("; "))} | ${esc(d)} |\n`;
  }
  return t;
}

let md = `# Perfox Platform API — Endpoint Inventory (SDK scope)

> Generated by \`scripts/generate-inventory.mjs\` from \`spec/openapi.json\`
> (snapshot of \`https://perfox.ai/api/v1/openapi.json?workspace=<slug>\`, OpenAPI ${spec.openapi}, API version ${spec.info.version}).
> Do not edit by hand — regenerate.

## Global contract

| Aspect | Documented behaviour |
|---|---|
| Server | \`${spec.servers[0].url}\` — ${spec.servers[0].description} |
| Authentication | ${spec.info.description} Scheme \`${Object.keys(spec.components.securitySchemes)[0]}\`: HTTP bearer, format \`${spec.components.securitySchemes.tenant_api_key.bearerFormat}\`. |
| Authorization | Each operation requires a key scope (listed per endpoint below). Missing scope → 403. |
| Error envelope | \`{ "error": string /* stable snake_case code */, "message"?: string }\` on every documented error status. |
| Documented error statuses | 401, 403, 404 on every operation. 409 (\`identity_conflict\`, \`link_conflict\`) and 422 (\`sender_not_authorized\`) are mentioned in operation descriptions only. |
| Rate limiting | **Not documented** for this API (no 429 response, no rate-limit headers). |
| Idempotency keys | **Not documented** (no \`Idempotency-Key\` header). |
| Request headers | Only \`Authorization\` is documented. JSON bodies are \`application/json\`; the KB upload is \`multipart/form-data\`. |

## Summary

| # | Category | Method | Path | operationId | Scope | SDK method | Pagination | Auto-retry |
|---|---|---|---|---|---|---|---|---|
`;

const ops = [];
for (const [path, item] of Object.entries(spec.paths)) {
  for (const [method, op] of Object.entries(item)) {
    if (method === "parameters") continue;
    if (!IN_SCOPE_TAGS.includes(op.tags?.[0])) continue;
    ops.push({ path, method: method.toUpperCase(), op });
  }
}
ops.sort((a, b) => IN_SCOPE_TAGS.indexOf(a.op.tags[0]) - IN_SCOPE_TAGS.indexOf(b.op.tags[0]));

const missing = ops.filter((o) => !SDK_MAPPING[o.op.operationId]).map((o) => o.op.operationId);
if (missing.length) throw new Error(`No SDK mapping for: ${missing.join(", ")}`);

ops.forEach(({ path, method, op }, i) => {
  const m = SDK_MAPPING[op.operationId];
  const scope = (op.security?.[0]?.tenant_api_key || []).join(", ");
  md += `| ${i + 1} | ${op.tags[0]} | ${method} | \`${path}\` | \`${op.operationId}\` | \`${scope}\` | \`${m.sdk}\` | ${m.pagination} | ${m.retry} |\n`;
});

const notCovered = [
  ...new Set(
    Object.values(spec.paths)
      .flatMap((i) => Object.values(i))
      .map((o) => o.tags?.[0])
      .filter((t) => t && !IN_SCOPE_TAGS.includes(t)),
  ),
];
md += `\n**Total in-scope operations: ${ops.length}.** ${
  notCovered.length
    ? `Tags present in the spec but not yet implemented: ${notCovered.join(", ")}.`
    : "Every tag in the spec is covered."
}\n`;

let currentTag = "";
for (const { path, method, op } of ops) {
  const tag = op.tags[0];
  if (tag !== currentTag) {
    md += `\n---\n\n## ${tag}\n`;
    currentTag = tag;
  }
  const m = SDK_MAPPING[op.operationId];
  md += `\n### \`${method} ${path}\` — ${op.summary}\n\n`;
  md += `- **operationId:** \`${op.operationId}\`\n`;
  md += `- **SDK method:** \`${m.sdk}\`\n`;
  md += `- **Auth:** Bearer API key, scope \`${(op.security?.[0]?.tenant_api_key || []).join(", ")}\`\n`;
  md += `- **Pagination:** ${PAGINATION_TEXT[m.pagination]}\n`;
  md += `- **SDK auto-retry:** ${m.retry}\n`;
  md += `- **Statuses:** ${Object.entries(op.responses)
    .map(([c, r]) => `${c} ${r.description}`)
    .join(", ")}\n`;
  if (op.description) md += `\n> ${op.description.replace(/\n/g, "\n> ")}\n`;

  const params = op.parameters || [];
  md += `\n**Parameters**\n\n`;
  if (!params.length) md += "_None documented._\n";
  else {
    md += "| In | Name | Type | Required | Constraints | Description |\n|---|---|---|---|---|---|\n";
    for (const p of params) {
      md += `| ${p.in} | \`${p.name}\` | ${typeOf(p.schema)} | ${p.required ? "yes" : "no"} | ${esc(constraints(p.schema || {}).join("; "))} | ${esc(p.description || p.schema?.description || "")} |\n`;
    }
  }

  if (op.requestBody) {
    for (const [ct, c] of Object.entries(op.requestBody.content)) {
      md += `\n**Request body** (\`${ct}\`, required: ${op.requestBody.required ? "yes" : "no"})\n\n`;
      md += fieldTable(flatten(c.schema));
    }
  } else {
    md += `\n**Request body:** none.\n`;
  }

  for (const [code, r] of Object.entries(op.responses)) {
    if (!code.startsWith("2")) continue;
    for (const [ct, c] of Object.entries(r.content || {})) {
      md += `\n**Response ${code}** (\`${ct}\`)\n\n`;
      md += fieldTable(flatten(c.schema));
    }
  }
}

writeFileSync(join(root, "docs/endpoint-inventory.md"), md);
console.log(`Wrote docs/endpoint-inventory.md (${ops.length} operations).`);
