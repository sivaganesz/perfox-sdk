# Changelog

## 0.1.0 — 2026-10-07

Initial release, built against Perfox Platform API spec version 1.0.0 (OpenAPI 3.1.0).

- `PerfoxClient` (also exported as `PlatformClient`), covering 44 operations across Customers,
  Conversations, Knowledge Base, Credentials, MCP Servers, Analytics, Calls, Billing, Outbound
  and Messages.
- Typed errors, per-attempt timeouts, `AbortSignal` support, and retries limited to operations
  that are safe to repeat.
- Async-iterable pagination for cursor- and timestamp-paginated endpoints.
- Multipart Knowledge Base upload from `File`, `Blob`, `Buffer`, `ArrayBuffer` or typed arrays.
