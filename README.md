# perfox-sdk

A strongly typed TypeScript SDK for the [Perfox Platform API](https://perfox.ai/api/v1/docs).

It covers 10 API categories (44 operations): **Customers, Conversations, Knowledge Base,
Credentials, MCP Servers, Analytics, Calls, Billing, Outbound and Messages**. The full,
spec-generated endpoint inventory is in [`docs/endpoint-inventory.md`](docs/endpoint-inventory.md).

- Zero runtime dependencies. Works on Node.js 18.17+, Bun, Deno and edge runtimes (uses global `fetch`).
- ESM and CommonJS builds with bundled type declarations.
- Request/response types are verified against the published OpenAPI spec in CI.
- Timeouts, cancellation, safe automatic retries, typed errors, and auto-pagination.

> This is a **server-to-server** API. Never ship your API key to a browser.

## Install

```sh
npm install perfox-sdk
```

## Quick start

```ts
import { PerfoxClient } from "perfox-sdk";

const perfox = new PerfoxClient({
  apiKey: process.env.PERFOX_API_KEY, // sk_… from Studio → Settings → API Keys
  workspace: "acme",                  // calls https://acme-api.perfox.ai/api/v1
});

const customer = await perfox.customers.create({
  name: "Asha",
  phone: "+91 98765 43210", // canonicalised to E.164 server-side
  external_id: "user-42",
});

const details = await perfox.customers.getDetails(customer.id);
console.log(details.insights.resolution.resolution_rate);
```

## Configuration

| Option | Default | Description |
|---|---|---|
| `apiKey` | `PERFOX_API_KEY` env var | Tenant API key, sent as `Authorization: Bearer …`. |
| `workspace` | `PERFOX_WORKSPACE` env var | Workspace slug, used to build `https://{workspace}-api.perfox.ai/api/v1`. |
| `baseUrl` | `PERFOX_BASE_URL` env var | Full base URL (including `/api/v1`), e.g. for a proxy. Overrides `workspace`. |
| `timeoutMs` | `60000` | Per-attempt timeout. Covers both the request and reading the body. |
| `maxRetries` | `2` | Retries for operations that are safe to repeat (see [Retries](#retries)). |
| `defaultHeaders` | — | Extra headers sent on every request. |
| `fetch` | global `fetch` | Custom fetch implementation. |

Every method also takes an optional final `RequestOptions` argument:
`{ signal?, timeoutMs?, maxRetries?, headers? }`.

```ts
const controller = new AbortController();
await perfox.calls.list({ limit: 50 }, { signal: controller.signal, timeoutMs: 10_000 });
```

## API reference

Field names are exactly the API's own (snake_case). Request and response bodies are passed
through unchanged: there is no renaming and no number or precision conversion.

### Customers — `perfox.customers`

| Method | Endpoint |
|---|---|
| `create(params)` | `POST /customers` — create-or-find by phone/email/external_id; idempotent on identity |
| `list()` | `GET /customers` |
| `get(id)` | `GET /customers/{id}` |
| `update(id, params)` | `PATCH /customers/{id}` |
| `getDetails(id)` | `GET /customers/{id}/details` — stats and insights |
| `listConversations(id, params?)` / `iterateConversations(id, params?)` | `GET /customers/{id}/conversations` |
| `link(params)` | `POST /customer/link` |
| `getLinks({ external_id })` | `GET /customer/link` |
| `deleteLinks({ external_id })` | `DELETE /customer/link` |
| `linkBatch({ links })` | `POST /customer/link/batch` — up to 500 links |

```ts
import { ConflictError } from "perfox-sdk";

try {
  await perfox.customers.link({
    external_id: "user-42",
    identifiers: { email: "asha@example.com", name: "Asha" },
  });
} catch (error) {
  if (error instanceof ConflictError && error.code === "link_conflict") {
    // An existing link to a different external_id matches — delete it first.
  }
}
```

### Conversations — `perfox.conversations`

| Method | Endpoint |
|---|---|
| `list()` | `GET /conversations` |
| `listCases()` | `GET /cases` |
| `get(id)` | `GET /conversations/{id}` |
| `getTranscript(id, params?)` / `iterateTranscript(id, params?)` | `GET /conversations/{id}/events` |

```ts
for await (const event of perfox.conversations.iterateTranscript(conversationId, {
  include: ["tool_io", "delivery"], // sent as include=tool_io,delivery
})) {
  console.log(event.actor, event.text);
}
```

### Knowledge Base — `perfox.knowledgeBase`

| Method | Endpoint |
|---|---|
| `uploadFile({ file, name?, folder_id? })` | `POST /kb/files` (multipart) |
| `listFiles(params?)` / `iterateFiles(params?)` | `GET /kb/files` |
| `search({ query, kb_id?, folder_id?, top_k? })` | `POST /kb/search` |
| `getFile(id)` | `GET /kb/files/{id}` |
| `deleteFile(id)` | `DELETE /kb/files/{id}` |
| `moveFile(id, { folder_id })` | `POST /kb/files/{id}/move` (`null` = root) |
| `listFolders({ parent_id? })` | `GET /kb/folders` |
| `createFolder({ name, parent_id? })` | `POST /kb/folders` |
| `updateFolder(id, { name })` | `PATCH /kb/folders/{id}` (rename) |
| `deleteFolder(id)` | `DELETE /kb/folders/{id}` (folder must be empty) |

Indexing is asynchronous. An upload returns a `pending` file; poll `getFile` until it is `indexed`.

```ts
import { readFile } from "node:fs/promises";

const file = await perfox.knowledgeBase.uploadFile({
  file: { data: await readFile("refunds.pdf"), filename: "refunds.pdf", contentType: "application/pdf" },
  name: "Refund policy",
});
// In browsers: uploadFile({ file: inputElement.files[0] })
```

### Credentials — `perfox.credentials`

| Method | Endpoint |
|---|---|
| `register({ name, type, description?, config })` | `POST /credentials` |
| `list()` | `GET /credentials` |
| `get(id)` | `GET /credentials/{id}` |
| `listResources(id)` | `GET /credentials/{id}/resources` |

Secret `config` values are write-only. Responses list only the key names that are set
(`config_fields`). The SDK never logs request bodies, and errors never include them.

### MCP Servers — `perfox.mcpServers`

| Method | Endpoint |
|---|---|
| `register(params)` | `POST /mcp-servers` |
| `list()` | `GET /mcp-servers` |
| `get(id)` | `GET /mcp-servers/{id}` |
| `update(id, params)` | `PATCH /mcp-servers/{id}` — omit `auth_secret` to keep the current secret |

### Analytics — `perfox.analytics`

| Method | Endpoint |
|---|---|
| `getSummary(window?)` | `GET /analytics/summary` |
| `getConversationsOverTime(window?)` | `GET /analytics/conversations-over-time` |
| `getChannelBreakdown(window?)` | `GET /analytics/channel-breakdown` |

`window` is `{ days?, start_date?, end_date?, interval? }`. Use `days` for a rolling window, or
explicit dates.

### Calls — `perfox.calls`

| Method | Endpoint |
|---|---|
| `list(params?)` / `iterate(params?)` | `GET /calls` |
| `get(id)` | `GET /calls/{id}` |
| `getRecordings(conversationId)` | `GET /conversations/{id}/recordings` — short-lived signed URLs; fetch them when needed, don't store them |

### Billing — `perfox.billing`

| Method | Endpoint |
|---|---|
| `getCredits()` | `GET /billing/credits` |
| `getUsage(window?)` | `GET /billing/usage` |

### Outbound — `perfox.outbound`

| Method | Endpoint |
|---|---|
| `create(params)` | `POST /outbound` — start a conversation on phone, sms, whatsapp or email |

The response describes the *started* execution. Check `send_authorized`: on text channels, the
agent can only send if its Sender node is wired.

### Messages — `perfox.messages`

| Method | Endpoint |
|---|---|
| `create(params)` | `POST /messages` — send a WhatsApp message you compose |
| `list(params?)` / `iterate(params?)` | `GET /messages` |
| `get(id)` | `GET /messages/{id}` — delivery state and history |

The documented "exactly one of" rules are enforced by the types: exactly one of
`text` / `media` / `location` / `template`, and exactly one of `from` / `agent_id`.

```ts
const sent = await perfox.messages.create({
  to: "+919876543210",
  from: "+911234567890",
  template: { name: "order_update", language: "en_US", body_parameters: ["Asha", "#123"] },
});
// "sent" = accepted by the provider; delivered/read arrive later:
const message = await perfox.messages.get(sent.id);
```

## Pagination

Cursor-paginated endpoints have a `list*` method that returns one page and an `iterate*` method
that returns a lazy, async-iterable `Paginator`:

```ts
for await (const call of perfox.calls.iterate({ status: "completed" })) {
  /* every call, page by page */
}

for await (const page of perfox.messages.iterate({ limit: 200 }).pages()) {
  /* whole pages */
}

const first500 = await perfox.knowledgeBase.iterateFiles().toArray({ maxItems: 500 });
```

## Errors

Every error extends `PerfoxError`. HTTP failures extend `APIError`, which carries `status`,
`code` (the API's stable snake_case `error`), `detail` (the API's `message`), `headers`, `body`,
`method` and `path`.

| Class | Cause |
|---|---|
| `AuthenticationError` | 401 — missing or invalid API key |
| `PermissionDeniedError` | 403 — key lacks the operation's scope |
| `NotFoundError` | 404 |
| `ConflictError` | 409 — e.g. `identity_conflict`, `link_conflict` |
| `ValidationError` | 400 / 422 — e.g. `sender_not_authorized` |
| `RateLimitError` | 429 — has `retryAfterMs` |
| `InternalServerError` | 5xx |
| `APIError` | any other non-2xx status |
| `TimeoutError` (a `NetworkError`) | attempt exceeded `timeoutMs` |
| `NetworkError` | no HTTP response (DNS, TLS, reset, …) |
| `RequestAbortedError` | your `AbortSignal` fired |
| `InvalidRequestError` | SDK misuse caught before sending (missing key, empty id, …) |

## Retries

Retries use exponential backoff with jitter and honour `Retry-After`. They trigger on network
errors, timeouts, 408, 429 and 5xx (except 501), **and only for operations that are safe to repeat**:

- every `GET` and `DELETE`;
- `customers.create`, `customers.link` and `customers.linkBatch`, which the docs describe as idempotent;
- `knowledgeBase.search`, which is read-only.

Operations with side effects are **never retried automatically**: `messages.create`,
`outbound.create`, `knowledgeBase.uploadFile`, `knowledgeBase.createFolder`/`moveFile`/`updateFolder`,
`credentials.register`, `mcpServers.register`/`update`, and `customers.update`. The API documents no
idempotency key, so a retry could send a message twice. To opt one call in deliberately,
pass `{ maxRetries: n }` for that call.

## Extending

New API categories can be added without touching the transport:

```ts
import { APIResource, buildPath, type RequestOptions } from "perfox-sdk";

class Widgets extends APIResource {
  async get(id: string, options?: RequestOptions) {
    return this._request<{ id: string }>(
      { method: "GET", path: buildPath("/widgets/{id}", { id }), idempotent: true },
      options,
    );
  }
}

const widgets = perfox.resource(Widgets);
```

`perfox.request({ method, path, query?, body?, idempotent })` is also available for raw calls
that need the response `status` and `headers`.

## Known gaps in the API documentation

The SDK implements exactly what the spec documents. Where the docs are silent, it doesn't guess:

- `GET /cases` returns `pagination { page, page_size, total, total_pages }`, but no request
  parameter for choosing a page is documented. `listCases()` therefore takes no parameters.
- `GET /conversations`, `/customers`, `/credentials` and `/mcp-servers` document no
  pagination or filters.
- In the KB upload, `folder_id: null` ("root") has no documented multipart encoding, so the
  SDK omits the field for `null`.
- Rate limits, `Retry-After`, and the status code used for schema-validation errors are not documented.

See [`docs/implementation-plan.md`](docs/implementation-plan.md) for the full list.

## Development

```sh
npm run typecheck   # tsc on src + tests (including the type-level spec contract)
npm test            # vitest: unit tests + runtime spec contract tests
npm run build       # tsup → dist (ESM + CJS + .d.ts)
npm run validate    # all of the above + publint + are-the-types-wrong + npm pack --dry-run
```

Keeping in sync with the API:

```sh
npm run spec:fetch -- <workspace>   # refresh spec/openapi.json, report added/removed operations
npm run spec:types                  # regenerate test/generated/openapi.d.ts
npm run spec:inventory              # regenerate docs/endpoint-inventory.md
npm test                            # contract tests fail on any drift
```
