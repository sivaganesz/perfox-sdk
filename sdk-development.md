# Task: Build a Production-Grade TypeScript SDK for the Platform APIs

## Objective

Build a production-ready, maintainable, strongly typed TypeScript SDK for the platform documented at the public API documentation URL that I will provide.

The platform exposes APIs grouped into multiple functional categories.

I currently need SDK support for ONLY these 10 API categories:

1. Customers
2. Conversations
3. Knowledge Base
4. Credentials
5. MCP Servers
6. Analytics
7. Calls
8. Billing
9. Outbound
10. Messages

The platform has additional API categories, but DO NOT implement those categories now.

The SDK architecture must, however, be designed so additional API categories can be added later without requiring a major refactor.

---

# 1. Source of Truth

I will provide:

1. The public main API documentation URL
2. Screenshots of the API documentation/navigation
3. Any additional relevant information if required

Use the provided public documentation as the PRIMARY SOURCE OF TRUTH.

Do NOT invent:

- API endpoints
- HTTP methods
- request fields
- response fields
- authentication mechanisms
- query parameters
- path parameters
- pagination behavior
- error formats
- enum values
- headers
- webhook behavior
- API versions

If something is unclear or unavailable in the documentation, investigate the documentation thoroughly before making any implementation decision.

If something genuinely cannot be determined from the public documentation, clearly identify it instead of silently guessing.

---

# 2. API Categories to Implement

Implement SDK support for exactly these categories:

## Customers

Implement all publicly documented endpoints under the Customers category that are relevant and available from the provided documentation.

Examples may include operations such as:


- Create or update a customer
- List customers
- Get a customer
- Update a customer

IMPORTANT:

Do not assume these exact operations exist.

Inspect the documentation and implement the actual documented endpoints.

---

## Conversations

Implement all documented Conversations APIs.

This may include functionality such as:


- List conversations
- List cases (the case-management view of conversations)
- Get a conversation
- Get a conversation transcript

Again, use the documentation as the source of truth.

---

## Knowledge Base

Implement all documented Knowledge Base APIs.

Potential functionality may include:

- Upload a Knowledge Base document
- List Knowledge Base files
- Search the Knowledge Base (semantic)
- Get Knowledge Base file metadata
- Delete a Knowledge Base file
- Move a Knowledge Base file to a folder
- List Knowledge Base folders
- Create a Knowledge Base folder
- Rename a Knowledge Base folder
- Delete an EMPTY Knowledge base folder

Do not assume endpoint names or request structures.

---

## Credentials

Implement all documented Credentials APIs.

Pay particular attention to security-sensitive fields.

Never:

- Register a provider credential
- List provider credentials
- Get a provider credential
- List a credential's resources (numbers / senders) and which agent owns each

Follow the API documentation exactly.

---

## MCP Servers

Implement all documented MCP Server APIs.

The SDK should provide clean, strongly typed access to the MCP Server-related functionality documented by the platform.

Do not confuse:

- Register an MCP tool server
- List MCP tool servers
- Update an MCP tool server
- Get an MCP tool server

unless the documentation explicitly defines them that way.

---

## Analytics

Implement all documented Analytics APIs.

Pay special attention to:

- Dashboard summary
- Conversations over time
- Conversation volume by channel

Preserve the exact semantics of the API.

---

## Calls

Implement all documented Calls APIs.

This may include:


- List calls
- Get a call
- Get recording playback URLs

Only implement what is actually documented.

---

## Billing

Implement all documented Billing APIs.

Pay particular attention to:

- Credit balance
- Token usage

Do not convert monetary values or change precision unless the API documentation explicitly requires it.

---

## Outbound

Implement all documented Outbound APIs.

Pay special attention to:


- Reach out to a customer

Do not assume outbound APIs behave synchronously.

Follow the documented API behavior exactly.

---

## Messages

Implement all documented Messages APIs.

This may include:

- Send a WhatsApp message
- List sent messages
- Get one sent message

Do not assume supported channels or message types.

Implement only what is documented.

---

# 3. First Phase: Documentation Analysis

Before writing implementation code, perform a complete API documentation analysis.

Create an internal implementation plan containing:

- API category
- Endpoint
- HTTP method
- URL/path
- Authentication requirement
- Path parameters
- Query parameters
- Request body
- Request headers
- Response body
- Response status codes
- Pagination behavior
- Error behavior
- Rate-limit information
- Special requirements
- Any documented enums
- Any documented nullable fields

Create a complete endpoint inventory for the 10 categories.

DO NOT start coding immediately.

First understand the API surface.

---

# 4. Do Not Miss Nested APIs

The documentation may contain nested sections.

For example:

Customers
  ├── Create
  ├── List
  ├── Get
  └── Update

Conversations
  ├── List
  ├── Get
  └── Messages

Knowledge Base
  ├── Knowledge Bases
  ├── Documents
  └── Sources

Do not stop at the top-level navigation.

Explore the complete documentation hierarchy under each of the 10 selected categories.

---

# 5. SDK Architecture

Build the SDK using a clean modular architecture.

Prefer a structure similar to:

src/
├── client/
│   ├── client.ts
│   ├── http-client.ts
│   ├── request.ts
│   └── response.ts
│
├── resources/
│   ├── customers/
│   │   ├── customers.ts
│   │   └── types.ts
│   │
│   ├── conversations/
│   │   ├── conversations.ts
│   │   └── types.ts
│   │
│   ├── knowledge-base/
│   │   ├── knowledge-base.ts
│   │   └── types.ts
│   │
│   ├── credentials/
│   ├── mcp-servers/
│   ├── analytics/
│   ├── calls/
│   ├── billing/
│   ├── outbound/
│   └── messages/
│
├── errors/
│   ├── sdk-error.ts
│   ├── api-error.ts
│   ├── authentication-error.ts
│   ├── validation-error.ts
│   ├── rate-limit-error.ts
│   └── network-error.ts
│
├── types/
│   ├── common.ts
│   └── pagination.ts
│
└── index.ts

Adjust this structure if the actual API architecture suggests a better design.

The goal is maintainability, not blindly following this exact structure.

---

# 6. Main SDK Client

Provide one primary SDK client.

Example:

```ts
import { PlatformClient } from "PACKAGE_NAME";

const client = new PlatformClient({
  apiKey: process.env.PLATFORM_API_KEY,
});


PUBLIC_URL : https://perfox.ai/api/v1/docs?workspace=siva-workspace#description/introduction

Customers: https://perfox.ai/api/v1/docs?workspace=siva-workspace#tag/customers
Conversations: https://perfox.ai/api/v1/docs?workspace=siva-workspace#tag/conversations
Knowledge Base: https://perfox.ai/api/v1/docs?workspace=siva-workspace#tag/knowledge-base
Credentials: https://perfox.ai/api/v1/docs?workspace=siva-workspace#tag/credentials
MCP Servers: https://perfox.ai/api/v1/docs?workspace=siva-workspace#tag/mcp-servers
Analytics: https://perfox.ai/api/v1/docs?workspace=siva-workspace#tag/analytics
Calls: https://perfox.ai/api/v1/docs?workspace=siva-workspace#tag/calls
Billing: https://perfox.ai/api/v1/docs?workspace=siva-workspace#tag/billing
Outbound: https://perfox.ai/api/v1/docs?workspace=siva-workspace#tag/outbound
Messages: https://perfox.ai/api/v1/docs?workspace=siva-workspace#tag/messages