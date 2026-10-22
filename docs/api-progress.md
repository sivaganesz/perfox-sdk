# API Coverage Progress

Tracks SDK coverage of the Perfox Platform API: what exists, what is pending, and how
the API has changed over time. Use it to plan future work.

- **Source of truth:** [`spec/openapi.json`](../spec/openapi.json), a snapshot of
  `https://perfox.ai/api/v1/openapi.json?workspace=<slug>`.
- **Enforcement:** [`test/contract.test.ts`](../test/contract.test.ts) fails if any implemented
  operation is missing, duplicated or out of line with the spec. When this tracker and the tests
  disagree, the tests are right.
- **Full per-field contract:** [`endpoint-inventory.md`](./endpoint-inventory.md) (generated).

Status legend: ✅ done · 🚧 in progress · ⏳ pending

## 1. Summary

| # | Category | SDK resource | Total | Done | Pending | Status |
|---|---|---|---|---|---|---|
| 1 | Customers | `customers` | 10 | 10 | 0 | ✅ |
| 2 | Conversations | `conversations` | 4 | 4 | 0 | ✅ |
| 3 | Knowledge Base | `knowledgeBase` | 10 | 10 | 0 | ✅ |
| 4 | Credentials | `credentials` | 4 | 4 | 0 | ✅ |
| 5 | MCP Servers | `mcpServers` | 4 | 4 | 0 | ✅ |
| 6 | Analytics | `analytics` | 3 | 3 | 0 | ✅ |
| 7 | Calls | `calls` | 3 | 3 | 0 | ✅ |
| 8 | Billing | `billing` | 2 | 2 | 0 | ✅ |
| 9 | Outbound | `outbound` | 1 | 1 | 0 | ✅ |
| 10 | Messages | `messages` | 3 | 3 | 0 | ✅ |
| 11 | Agents | `agents` | 7 | 7 | 0 | ✅ |
| 12 | Support | `support` | 4 | 4 | 0 | ✅ |
| 13 | Templates | `templates` | 2 | 0 | 2 | ⏳ |
| 14 | Webhooks | `webhooks` | 5 | 0 | 5 | ⏳ |
| | **Total** | | **62** | **55** | **7** | **89%** |

## 2. Full inventory

"Tests" means covered by the runtime contract test, the type-level contract test and unit tests.

### Customers (10/10)

| Method | Path | operationId | SDK method | Status | Tests |
|---|---|---|---|---|---|
| POST | `/customers` | `customers.create` | `customers.create` | ✅ | ✅ |
| GET | `/customers` | `customers.list` | `customers.list` | ✅ | ✅ |
| GET | `/customers/{id}` | `customers.get` | `customers.get` | ✅ | ✅ |
| PATCH | `/customers/{id}` | `customers.update` | `customers.update` | ✅ | ✅ |
| GET | `/customers/{id}/details` | `customers.details` | `customers.getDetails` | ✅ | ✅ |
| GET | `/customers/{id}/conversations` | `customers.conversations` | `customers.listConversations` / `iterateConversations` | ✅ | ✅ |
| POST | `/customer/link` | `customers.link` | `customers.link` | ✅ | ✅ |
| GET | `/customer/link` | `customers.link_get` | `customers.getLinks` | ✅ | ✅ |
| DELETE | `/customer/link` | `customers.link_delete` | `customers.deleteLinks` | ✅ | ✅ |
| POST | `/customer/link/batch` | `customers.link_batch` | `customers.linkBatch` | ✅ | ✅ |

### Conversations (4/4)

| Method | Path | operationId | SDK method | Status | Tests |
|---|---|---|---|---|---|
| GET | `/conversations` | `conversations.list` | `conversations.list` | ✅ | ✅ |
| GET | `/cases` | `cases.list` | `conversations.listCases` | ✅ | ✅ |
| GET | `/conversations/{id}` | `conversations.get` | `conversations.get` | ✅ | ✅ |
| GET | `/conversations/{id}/events` | `conversations.events` | `conversations.getTranscript` / `iterateTranscript` | ✅ | ✅ |

### Knowledge Base (10/10)

| Method | Path | operationId | SDK method | Status | Tests |
|---|---|---|---|---|---|
| POST | `/kb/files` | `kb.upload_file` | `knowledgeBase.uploadFile` | ✅ | ✅ |
| GET | `/kb/files` | `kb.list_files` | `knowledgeBase.listFiles` / `iterateFiles` | ✅ | ✅ |
| POST | `/kb/search` | `kb.search` | `knowledgeBase.search` | ✅ | ✅ |
| GET | `/kb/files/{id}` | `kb.get_file` | `knowledgeBase.getFile` | ✅ | ✅ |
| DELETE | `/kb/files/{id}` | `kb.delete_file` | `knowledgeBase.deleteFile` | ✅ | ✅ |
| POST | `/kb/files/{id}/move` | `kb.move_file` | `knowledgeBase.moveFile` | ✅ | ✅ |
| GET | `/kb/folders` | `kb.list_folders` | `knowledgeBase.listFolders` | ✅ | ✅ |
| POST | `/kb/folders` | `kb.create_folder` | `knowledgeBase.createFolder` | ✅ | ✅ |
| PATCH | `/kb/folders/{id}` | `kb.update_folder` | `knowledgeBase.updateFolder` | ✅ | ✅ |
| DELETE | `/kb/folders/{id}` | `kb.delete_folder` | `knowledgeBase.deleteFolder` | ✅ | ✅ |

### Credentials (4/4)

| Method | Path | operationId | SDK method | Status | Tests |
|---|---|---|---|---|---|
| POST | `/credentials` | `credentials.register` | `credentials.register` | ✅ | ✅ |
| GET | `/credentials` | `credentials.list` | `credentials.list` | ✅ | ✅ |
| GET | `/credentials/{id}` | `credentials.get` | `credentials.get` | ✅ | ✅ |
| GET | `/credentials/{id}/resources` | `credentials.resources` | `credentials.listResources` | ✅ | ✅ |

### MCP Servers (4/4)

| Method | Path | operationId | SDK method | Status | Tests |
|---|---|---|---|---|---|
| POST | `/mcp-servers` | `mcp_servers.register` | `mcpServers.register` | ✅ | ✅ |
| GET | `/mcp-servers` | `mcp_servers.list` | `mcpServers.list` | ✅ | ✅ |
| PATCH | `/mcp-servers/{id}` | `mcp_servers.update` | `mcpServers.update` | ✅ | ✅ |
| GET | `/mcp-servers/{id}` | `mcp_servers.get` | `mcpServers.get` | ✅ | ✅ |

### Analytics (3/3)

| Method | Path | operationId | SDK method | Status | Tests |
|---|---|---|---|---|---|
| GET | `/analytics/summary` | `analytics.summary` | `analytics.getSummary` | ✅ | ✅ |
| GET | `/analytics/conversations-over-time` | `analytics.conversations_over_time` | `analytics.getConversationsOverTime` | ✅ | ✅ |
| GET | `/analytics/channel-breakdown` | `analytics.channel_breakdown` | `analytics.getChannelBreakdown` | ✅ | ✅ |

### Calls (3/3)

| Method | Path | operationId | SDK method | Status | Tests |
|---|---|---|---|---|---|
| GET | `/calls` | `calls.list` | `calls.list` / `iterate` | ✅ | ✅ |
| GET | `/calls/{id}` | `calls.get` | `calls.get` | ✅ | ✅ |
| GET | `/conversations/{id}/recordings` | `calls.recordings` | `calls.getRecordings` | ✅ | ✅ |

### Billing (2/2)

| Method | Path | operationId | SDK method | Status | Tests |
|---|---|---|---|---|---|
| GET | `/billing/credits` | `billing.credits` | `billing.getCredits` | ✅ | ✅ |
| GET | `/billing/usage` | `billing.usage` | `billing.getUsage` | ✅ | ✅ |

### Outbound (1/1)

| Method | Path | operationId | SDK method | Status | Tests |
|---|---|---|---|---|---|
| POST | `/outbound` | `outbound.create` | `outbound.create` | ✅ | ✅ |

### Messages (3/3)

| Method | Path | operationId | SDK method | Status | Tests |
|---|---|---|---|---|---|
| POST | `/messages` | `messages.create` | `messages.create` | ✅ | ✅ |
| GET | `/messages` | `messages.list` | `messages.list` / `iterate` | ✅ | ✅ |
| GET | `/messages/{id}` | `messages.get` | `messages.get` | ✅ | ✅ |

### Agents (7/7)

| Method | Path | operationId | SDK method | Status | Tests |
|---|---|---|---|---|---|
| POST | `/agents` | `agents.create` | `agents.create` | ✅ | ✅ |
| GET | `/agents` | `agents.list` | `agents.list` | ✅ | ✅ |
| GET | `/agents/{id}` | `agents.get` | `agents.get` | ✅ | ✅ |
| PATCH | `/agents/{id}` | `agents.update` | `agents.update` | ✅ | ✅ |
| POST | `/agents/{id}/publish` | `agents.publish` | `agents.publish` | ✅ | ✅ |
| POST | `/agents/from-spec` | `agents.create_from_spec` | `agents.createFromSpec` | ✅ | ✅ |
| POST | `/agents/generate` | `agents.generate` | `agents.generate` | ✅ | ✅ |

### Support (4/4)

| Method | Path | operationId | SDK method | Status | Tests |
|---|---|---|---|---|---|
| POST | `/support/tickets` | `support.create_ticket` | `support.createTicket` | ✅ | ✅ |
| GET | `/support/tickets` | `support.list_tickets` | `support.listTickets` | ✅ | ✅ |
| GET | `/support/tickets/{id}` | `support.get_ticket` | `support.getTicket` | ✅ | ✅ |
| POST | `/support/tickets/{id}/reply` | `support.reply_ticket` | `support.replyToTicket` | ✅ | ✅ |

### Templates (0/2)

| Method | Path | operationId | SDK method (planned) | Status | Tests |
|---|---|---|---|---|---|
| POST | `/templates/sync` | `templates.sync` | `templates.sync` | ⏳ | — |
| GET | `/templates` | `templates.list` | `templates.list` | ⏳ | — |

### Webhooks (0/5)

| Method | Path | operationId | SDK method (planned) | Status | Tests |
|---|---|---|---|---|---|
| POST | `/webhook-subscriptions` | `webhooks.create` | `webhooks.create` | ⏳ | — |
| GET | `/webhook-subscriptions` | `webhooks.list` | `webhooks.list` | ⏳ | — |
| PATCH | `/webhook-subscriptions/{id}` | `webhooks.patch` | `webhooks.update` | ⏳ | — |
| DELETE | `/webhook-subscriptions/{id}` | `webhooks.delete` | `webhooks.delete` | ⏳ | — |
| POST | `/webhook-subscriptions/{id}/test` | `webhooks.test` | `webhooks.test` | ⏳ | — |

## 3. API change log

Differences between the live documentation and the snapshot the SDK was built from.

| Detected | Operation(s) | Change | Handling | Status |
|---|---|---|---|---|
| 2026-10-22 | `customers.conversations`, `conversations.list`, `conversations.get` | Conversation `status` description now lists `ended` (`active \| ended \| resolved \| escalated \| abandoned`). | Added `"ended"` to `ConversationStatus`. Closes gap G3 in the implementation plan. | ✅ |
| 2026-10-22 | `credentials.register` | Request `type` enum gained `app_platform_key`. | Added to `CredentialType` (the type-level contract test caught this drift). | ✅ |

## 4. Decisions and documentation gaps

### Retry policy for the new operations

Automatic retries apply only to operations that are safe to repeat (the same rule as the existing SDK).

| Operation | Auto-retry | Reason |
|---|---|---|
| All `GET`s, `webhooks.delete` | Yes | Read-only or idempotent. |
| `agents.create`, `agents.createFromSpec`, `agents.generate` | No | A repeat creates a second agent (`generate` also spends LLM calls). |
| `agents.update`, `webhooks.update` | No | Consistent with all PATCH operations. `rotate_secret` would mint a second secret. |
| `agents.publish` | No | Each publish snapshots a new version. |
| `support.createTicket`, `support.replyToTicket` | No | A repeat files a duplicate ticket or reply. |
| `templates.sync` | No | Expensive: one provider read per template, subject to provider rate limits. |
| `webhooks.create` | No | A repeat would create a duplicate subscription whose one-time secret is never seen. |
| `webhooks.test` | No | The caller wants the actual synchronous result. |

### Open questions and gaps in the documentation

| # | Gap | Decision |
|---|---|---|
| D1 | Webhook payloads (`message.inbound`, `message.status`) have no documented schema. | Not typed by the SDK. |
| D2 | Webhook signature: `X-Perfox-Signature: t=<unix>,v1=<hmac-sha256>` over `<t>.<raw body>`. The signature encoding (hex or base64) and the timestamp tolerance are not documented. | **No verification helper for now (option a, approved 2026-10-22).** The scheme is documented in the README. Revisit once the encoding is confirmed with a live test delivery. |
| D3 | `GET /templates?number=` has no description. | Passed through as `number?: string`, without inferred meaning. |
| D4 | `GET /agents` and `GET /support/tickets` document no pagination or filters. | Single call, no parameters. |
| D5 | `POST /agents/{id}/publish` returns 422 with "node-tagged validation errors"; their shape is undocumented. | Surfaced as `ValidationError`; the raw body is on `error.body`. |

Gaps in the first 10 categories are listed in [`implementation-plan.md`](./implementation-plan.md).

## 5. Work log

| Date | Branch | Commit | Change | Tests |
|---|---|---|---|---|
| 2026-10-07 | `master` | `b5aac74` | v0.1.0: 10 categories, 44 operations. | 292 passed |
| 2026-10-22 | `feat/remaining-api-categories` | `20b60c2` | Analysis approved; branch and this tracker created. | — |
| 2026-10-22 | `feat/remaining-api-categories` | `b4014d1` | Spec snapshot refreshed; `ended` status and `app_platform_key` credential type added. | 292 passed |
| 2026-10-22 | `feat/remaining-api-categories` | `d25b928` | Agents: 7 operations (`agents.*`). | 326 passed |
| 2026-10-22 | `feat/remaining-api-categories` | _Support_ | Support: 4 operations (`support.*`). | 344 passed |

## 6. How to update

1. `npm run spec:fetch -- <workspace>` refreshes the spec and prints added or removed operations.
2. `npm run spec:types && npm run spec:inventory` regenerates the reference types and inventory.
3. `npm test` shows field-level drift through the contract tests.
4. Record changes in §3, implement, then update §1, §2 and §5.
