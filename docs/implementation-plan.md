# Implementation Plan & Documentation Findings

Source of truth: `spec/openapi.json`, a snapshot of the OpenAPI document that backs the public
docs page (`https://perfox.ai/api/v1/docs?workspace=<slug>` loads Scalar with
`data-url="/api/v1/openapi.json?workspace=<slug>"`). The full per-endpoint contract is in
[`endpoint-inventory.md`](./endpoint-inventory.md), generated from that snapshot.

## 1. Scope

44 operations across the 10 requested tags. Out-of-scope tags in the spec (not implemented):
Agents, Support, Templates, Webhooks.

| Category | Ops | SDK resource |
|---|---|---|
| Customers | 10 | `client.customers` |
| Conversations | 4 | `client.conversations` |
| Knowledge Base | 10 | `client.knowledgeBase` |
| Credentials | 4 | `client.credentials` |
| MCP Servers | 4 | `client.mcpServers` |
| Analytics | 3 | `client.analytics` |
| Calls | 3 | `client.calls` |
| Billing | 2 | `client.billing` |
| Outbound | 1 | `client.outbound` |
| Messages | 3 | `client.messages` |

## 2. Architecture

```
src/
├── index.ts                 public exports
├── version.ts
├── client/
│   ├── client.ts            PerfoxClient — wires config + resources
│   ├── config.ts            ClientOptions, base-URL resolution, env fallback
│   ├── http-client.ts       fetch transport: auth, timeout, retry, error mapping
│   ├── request.ts           RequestOptions, path/query building
│   └── response.ts          ApiResponse (status + headers + data)
├── core/
│   ├── resource.ts          APIResource base class (new categories extend this)
│   ├── pagination.ts        Paginator (async-iterable) for cursor / timestamp paging
│   └── uploads.ts           multipart helpers
├── errors/                  error hierarchy (see §4)
├── types/
│   ├── common.ts            shared primitives (ISO timestamps, Ids, open string unions)
│   └── pagination.ts        page shapes
└── resources/<category>/    <category>.ts (methods) + types.ts (contract types) + index.ts
```

Adding a future category = new `resources/<name>/` folder extending `APIResource`, plus one
property on `PerfoxClient`. No transport/core changes needed.

## 3. Transport decisions

| Concern | Decision | Basis |
|---|---|---|
| Base URL | `https://{workspace}-api.perfox.ai/api/v1`; caller passes `workspace` or a full `baseUrl`. No default workspace (the spec's default is the slug of the account that opened the docs). | `servers[0]` |
| Auth | `Authorization: Bearer <apiKey>` on every request. Key never appears in errors/logs. | `securitySchemes.tenant_api_key` |
| Env fallback | `PERFOX_API_KEY`, `PERFOX_WORKSPACE`, `PERFOX_BASE_URL` when options omitted (Node only). | SDK convenience, no API impact |
| Runtime | Global `fetch`/`FormData`/`Blob` (Node ≥ 18, Bun, Deno, edge). Custom `fetch` injectable. | — |
| Timeouts | Default 60 s per attempt, overridable per client and per call; caller `AbortSignal` honoured. | SDK policy |
| Retries | Exponential backoff + jitter, honours `Retry-After` if a server sends it. Retries on network errors, timeouts, 408, 429, 5xx. **Only for operations safe to repeat** (GETs, DELETEs, and POSTs the docs call idempotent/read-only). Non-idempotent writes (send message, outbound, upload, register, create folder, PATCH, move) are not retried unless the caller explicitly passes `maxRetries` for that call. | Docs: outbound/messages actually send; no idempotency key documented |
| Responses | Returned exactly as received — no field renaming, no number/precision conversion (billing balances stay `number`), unknown fields preserved. | Requirement + `additionalProperties:false` is a server promise, not something the SDK strips |
| Validation | SDK validates only what would otherwise build a wrong URL (empty path ids). Body/param validation is left to the server so the SDK cannot drift from it. | Avoids duplicating server rules |

## 4. Errors

All errors extend `PerfoxError`. HTTP errors extend `APIError` and carry `status`, `code` (the
envelope's `error`), `message`, `headers`, raw `body`, `method`, `path`.

| Class | When |
|---|---|
| `AuthenticationError` | 401 |
| `PermissionDeniedError` | 403 (e.g. key lacks the operation's scope) |
| `NotFoundError` | 404 |
| `ConflictError` | 409 (`identity_conflict`, `link_conflict`) |
| `ValidationError` | 400, 422 (e.g. `sender_not_authorized`) |
| `RateLimitError` | 429 (defensive — not documented), exposes `retryAfterMs` |
| `InternalServerError` | ≥ 500 |
| `APIError` | any other non-2xx |
| `NetworkError` / `TimeoutError` / `AbortError` | transport failures |
| `InvalidRequestError` | SDK-side misuse (empty id, missing apiKey) — thrown before any request |

## 5. Pagination helpers

| Style | Endpoints | Helper |
|---|---|---|
| Opaque cursor (`limit`,`cursor` → `next_cursor`) | customers.conversations, kb.list_files, calls.list, messages.list | `iterate*()` returns a `Paginator` — `for await` over items, or `.pages()` |
| Timestamp (`limit`,`after` → `next_after`,`has_more`) | conversations.events | `conversations.iterateTranscript()` |
| Page metadata only | cases.list | none — no page request param is documented (see gaps) |

## 6. Conflicts between `sdk-development.md` and the API documentation

| # | `sdk-development.md` says | Documentation says | Resolution |
|---|---|---|---|
| C1 | Credentials: "**Never:** Register / List / Get / List a credential's resources" | Those are exactly the 4 documented Credentials operations; the same file also says "Implement all documented Credentials APIs". | Read as a drafting error. All 4 implemented; secret `config` values are write-only per docs and the SDK never logs request bodies. **Confirm with the author.** |
| C2 | Knowledge Base nested sections "Knowledge Bases / Documents / Sources" | Only files, folders and search exist. `kb_id` appears solely as a search filter. | Implemented what is documented. |
| C3 | Conversations nested "Messages" | No per-conversation messages endpoint; the transcript is `GET /conversations/{id}/events`. | Implemented `getTranscript`. |
| C4 | Customers examples list 4 ops | Docs have 10 (adds details, customer conversations, 4 identity-link ops). | Implemented all 10. |
| C5 | Calls: "Get recording playback URLs" | Lives at `GET /conversations/{id}/recordings` but is tagged Calls. | Exposed as `calls.getRecordings(conversationId)`. |
| C6 | Messages "do not assume channels" | `POST /messages` is WhatsApp-only; schema enum lists `whatsapp,sms,email,phone` but the description says any non-`whatsapp` value is refused. | Kept the documented enum unchanged; documented the refusal on the type. |
| C7 | Section 6 (Main SDK client) and the "production requirements / constraints" sections | File is truncated mid code-block. | Applied standard production practices (§3–5). Package name is a placeholder (`PACKAGE_NAME`) — chose `perfox-sdk`; class `PerfoxClient` (alias `PlatformClient` exported to match the example). |

## 7. Gaps / ambiguities inside the documentation

| # | Gap | SDK behaviour |
|---|---|---|
| G1 | `GET /cases` returns `pagination {page, page_size, total, total_pages}` but documents **no** query parameters, so later pages cannot be requested. | `listCases()` takes no params. Not guessed. |
| G2 | `GET /conversations`, `/customers`, `/credentials`, `/mcp-servers` document no params/pagination. Whether they truncate is unknown. | Single call, no params. |
| G3 | Conversation `status` is typed `string` with description "active \| resolved \| escalated \| abandoned", but the `GET /customers/{id}/conversations` filter enum also has `ended`, and customer details report `ended` counts. | Status typed as an open string union including the documented values. Filter uses the exact enum. |
| G4 | Error statuses: only 401/403/404 are formally declared; 409 and 422 appear in prose; the status used for schema-validation failures (400 vs 422) is not stated; no 429/5xx documented. | Status → error-class mapping in §4; unknown statuses fall back to `APIError`. |
| G5 | Rate limits and `Retry-After` are not documented. | Retry logic honours `Retry-After` if present, otherwise backoff. |
| G6 | KB upload: `folder_id` is `nullable` ("null for root") but in `multipart/form-data` there is no way to send JSON null, and the encoding of null is not documented. | `folder_id: null` or omitted ⇒ the field is not sent. Sending a string `"null"` would be a guess. |
| G7 | Analytics/billing `start_date` / `end_date` have no declared format; `interval` is accepted by `/analytics/summary` and `/analytics/channel-breakdown` with no described effect. | Passed through as plain strings; all documented params exposed. |
| G8 | `messages.create` "exactly one of `text`/`media`/`location`/`template`" and "exactly one of `from`/`agent_id`" are only in prose, not the schema. | Encoded as TypeScript union types (compile-time only); the server remains the authority. |
| G9 | Description-only enums (KB file `status`, credential `status`, transcript `actor`, `tool_status`, delivery `status`) are typed `string` in the schema. | Typed as open unions (`"indexed" \| … \| (string & {})`) — autocomplete without rejecting new values. |
| G10 | Credential `type` is an enum on register but a plain `string` in responses. | Kept as documented. |
| G11 | `POST /outbound` response requires `provider_message_id` but the description says it "may be empty". | Typed `string` (may be `""`). |

## 8. Verification plan

1. `tsc --noEmit` (`strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`) on `src`, `test`
   and `examples` (the README snippets).
2. Unit tests (vitest, mocked `fetch`): transport, auth header, retries, timeouts, errors,
   pagination, multipart.
3. **Spec-contract test**: loads `spec/openapi.json`, invokes every SDK method, and asserts
   (a) every in-scope operation is covered exactly once, (b) method + path match, (c) query params
   and JSON body keys sent ⊆ documented ones, (d) no out-of-scope operations are called.
4. **Type-contract test**: types generated from the spec with `openapi-typescript` are compared
   with the hand-written types (field names, optionality) at compile time.
5. Build dual ESM + CJS with declarations (`tsup`), then `publint` and `@arethetypeswrong/cli`,
   and `npm pack --dry-run`.
