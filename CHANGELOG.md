# Changelog

## 0.2.0 — 2026-10-22

Every documented operation is now covered: 62 operations across 14 categories.

### Added

- `perfox.agents`: `create`, `list`, `get`, `update`, `publish`, `createFromSpec`, `generate`.
- `perfox.support`: `createTicket`, `listTickets`, `getTicket`, `replyToTicket`.
- `perfox.templates`: `sync`, `list`.
- `perfox.webhooks`: `create`, `list`, `update`, `delete`, `test`.
- `CredentialType` accepts `app_platform_key`, newly documented for `credentials.register`.
- `ConversationStatus` includes `ended`, now part of the documented status values.

### Notes

- Write operations in the new categories are not retried automatically (duplicate agents,
  tickets, subscriptions or secrets), consistent with the existing retry policy.
- No webhook signature-verification helper yet: the signature encoding and timestamp tolerance
  are not documented. The scheme is described in the README.

## 0.1.0 — 2026-10-07

Initial release, built against Perfox Platform API spec version 1.0.0 (OpenAPI 3.1.0).

- `PerfoxClient` (also exported as `PlatformClient`), covering 44 operations across Customers,
  Conversations, Knowledge Base, Credentials, MCP Servers, Analytics, Calls, Billing, Outbound
  and Messages.
- Typed errors, per-attempt timeouts, `AbortSignal` support, and retries limited to operations
  that are safe to repeat.
- Async-iterable pagination for cursor- and timestamp-paginated endpoints.
- Multipart Knowledge Base upload from `File`, `Blob`, `Buffer`, `ArrayBuffer` or typed arrays.
