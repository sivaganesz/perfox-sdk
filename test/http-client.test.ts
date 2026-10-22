import { afterEach, describe, expect, test, vi } from "vitest";
import {
  APIError,
  AuthenticationError,
  ConflictError,
  InternalServerError,
  InvalidRequestError,
  NetworkError,
  NotFoundError,
  PerfoxError,
  PermissionDeniedError,
  RateLimitError,
  RequestAbortedError,
  TimeoutError,
  ValidationError,
  parseRetryAfter,
  type PerfoxClient,
} from "../src/index.js";
import { createTestClient, json, jsonBody, TEST_API_KEY } from "./helpers.js";

afterEach(() => {
  vi.useRealTimers();
});

/** Runs `fn` with fake timers, flushing all pending timers until it settles. */
async function withFakeTimers<T>(fn: () => Promise<T>): Promise<T> {
  vi.useFakeTimers();
  const promise = fn();
  promise.catch(() => undefined);
  await vi.runAllTimersAsync();
  return promise;
}

describe("request basics", () => {
  test("sends auth, accept, user-agent and JSON headers", async () => {
    const { client, requests } = createTestClient(() => json({ id: "cus_1" }));
    await client.customers.create({ name: "Asha" });
    const req = requests[0]!;
    expect(req.headers.get("authorization")).toBe(`Bearer ${TEST_API_KEY}`);
    expect(req.headers.get("accept")).toBe("application/json");
    expect(req.headers.get("content-type")).toBe("application/json");
    expect(req.headers.get("user-agent")).toMatch(/^perfox-sdk-typescript\/\d+\.\d+\.\d+$/);
    expect(jsonBody(req)).toEqual({ name: "Asha" });
  });

  test("GET requests carry no body or content-type", async () => {
    const { client, requests } = createTestClient(() => json({ data: [] }));
    await client.customers.list();
    expect(requests[0]!.body).toBeUndefined();
    expect(requests[0]!.headers.has("content-type")).toBe(false);
  });

  test("returns the parsed body unchanged (no field or number conversion)", async () => {
    const body = { balance: 1234.5678901234, balance_mc: 1234567890123, low_balance: false, out_of_credits: false };
    const { client } = createTestClient(() => json(body));
    await expect(client.billing.getCredits()).resolves.toEqual(body);
  });

  test("preserves unknown response fields (forward compatibility)", async () => {
    const { client } = createTestClient(() => json({ id: "cus_1", new_field: 1 }));
    await expect(client.customers.get("cus_1")).resolves.toEqual({ id: "cus_1", new_field: 1 });
  });

  test("drops undefined query params and serialises numbers", async () => {
    const { client, requests } = createTestClient(() => json({ data: [] }));
    await client.calls.list({ limit: 10, status: undefined });
    expect(requests[0]!.url.search).toBe("?limit=10");
  });

  test("encodes path parameters", async () => {
    const { client, requests } = createTestClient(() => json({}));
    await client.customers.get("a/b?c#d");
    expect(requests[0]!.url.pathname).toBe("/api/v1/customers/a%2Fb%3Fc%23d");
  });

  test.each(["", "   "])("rejects empty path id %j before sending", async (id) => {
    const { client, requests } = createTestClient();
    // Promise-returning methods reject (never throw synchronously)...
    const pending = client.customers.get(id);
    expect(pending).toBeInstanceOf(Promise);
    await expect(pending).rejects.toBeInstanceOf(InvalidRequestError);
    // ...while paginator factories fail fast at the call site.
    expect(() => client.customers.iterateConversations(id)).toThrow(InvalidRequestError);
    expect(requests).toHaveLength(0);
  });

  test("rejects an empty required query param before sending", async () => {
    const { client, requests } = createTestClient();
    await expect(client.customers.getLinks({ external_id: "" })).rejects.toBeInstanceOf(InvalidRequestError);
    await expect(client.customers.deleteLinks({ external_id: " " })).rejects.toBeInstanceOf(InvalidRequestError);
    expect(requests).toHaveLength(0);
  });

  test("merges default and per-request headers; Authorization cannot be overridden", async () => {
    const { client, requests } = createTestClient(() => json({ data: [] }), {
      defaultHeaders: { "X-Trace": "default", "X-Env": "test" },
    });
    await client.customers.list({ headers: { "X-Trace": "call", Authorization: "Bearer other" } });
    const headers = requests[0]!.headers;
    expect(headers.get("x-trace")).toBe("call");
    expect(headers.get("x-env")).toBe("test");
    expect(headers.get("authorization")).toBe(`Bearer ${TEST_API_KEY}`);
  });

  test("low-level request() returns status and headers", async () => {
    const { client } = createTestClient(() => json({ ok: 1 }, 201, { "x-custom": "v" }));
    const res = await client.request<{ ok: number }>({ method: "GET", path: "/billing/credits", idempotent: true });
    expect(res.status).toBe(201);
    expect(res.headers.get("x-custom")).toBe("v");
    expect(res.data).toEqual({ ok: 1 });
  });

  test("a non-JSON success body is an error, not silently returned", async () => {
    const { client } = createTestClient(() => new Response("<html>gateway</html>", { status: 200 }));
    const error = await client.customers.list().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PerfoxError);
    expect((error as Error).message).toMatch(/non-JSON/);
  });
});

describe("error mapping", () => {
  test.each([
    [400, ValidationError],
    [401, AuthenticationError],
    [403, PermissionDeniedError],
    [404, NotFoundError],
    [409, ConflictError],
    [422, ValidationError],
    [429, RateLimitError],
    [500, InternalServerError],
    [503, InternalServerError],
    [418, APIError],
  ])("%i → %s", async (status, ErrorClass) => {
    const { client } = createTestClient(() => json({ error: "some_code", message: "detail" }, status));
    const error = await client.customers.update("cus_1", {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorClass);
    expect(error).toBeInstanceOf(APIError);
    expect(error).toBeInstanceOf(PerfoxError);
    const apiError = error as APIError;
    expect(apiError.status).toBe(status);
    expect(apiError.code).toBe("some_code");
    expect(apiError.detail).toBe("detail");
    expect(apiError.method).toBe("PATCH");
    expect(apiError.path).toBe("/customers/cus_1");
    expect(apiError.message).toBe(`${status} some_code: detail (PATCH /customers/cus_1)`);
    expect(apiError.name).toBe(ErrorClass.name);
  });

  test("the real 401 envelope observed from the API", async () => {
    const { client } = createTestClient(() =>
      json({ error: "invalid_api_key", message: "Authorization: Bearer sk_<key> required." }, 401),
    );
    const error = (await client.customers.list().catch((e: unknown) => e)) as AuthenticationError;
    expect(error).toBeInstanceOf(AuthenticationError);
    expect(error.code).toBe("invalid_api_key");
  });

  test("409 conflict codes from customer linking", async () => {
    const { client } = createTestClient(() => json({ error: "identity_conflict" }, 409));
    const error = (await client.customers.link({ external_id: "u1", identifiers: { email: "a@b.co" } }).catch(
      (e: unknown) => e,
    )) as ConflictError;
    expect(error).toBeInstanceOf(ConflictError);
    expect(error.code).toBe("identity_conflict");
    expect(error.detail).toBeUndefined();
  });

  test("non-JSON error bodies are kept as text", async () => {
    const { client } = createTestClient(() => new Response("Bad Gateway", { status: 502 }));
    const error = (await client.customers.update("c", {}).catch((e: unknown) => e)) as APIError;
    expect(error).toBeInstanceOf(InternalServerError);
    expect(error.body).toBe("Bad Gateway");
    expect(error.code).toBeUndefined();
    expect(error.message).toContain("Bad Gateway");
  });

  test("errors never contain the API key or request body secrets", async () => {
    const { client } = createTestClient(() => json({ error: "bad_request" }, 400));
    const error = (await client.credentials
      .register({ name: "x", type: "plivo", config: { auth_token: "TOP-SECRET" } })
      .catch((e: unknown) => e)) as APIError;
    const serialised = JSON.stringify({ ...error, message: error.message, stack: error.stack });
    expect(serialised).not.toContain(TEST_API_KEY);
    expect(serialised).not.toContain("TOP-SECRET");
  });

  test("the client does not expose the API key when serialised or inspected", async () => {
    const { client } = createTestClient();
    const { inspect } = await import("node:util");
    expect(JSON.stringify(client)).not.toContain(TEST_API_KEY);
    expect(inspect(client, { depth: 10, showHidden: true })).not.toContain(TEST_API_KEY);
  });
});

describe("retries", () => {
  test("retries idempotent requests on 5xx, then succeeds", async () => {
    const { client, requests } = createTestClient((_, i) =>
      i < 2 ? json({ error: "unavailable" }, 503) : json({ data: [] }),
    );
    await expect(withFakeTimers(() => client.customers.list())).resolves.toEqual({ data: [] });
    expect(requests).toHaveLength(3);
  });

  test("gives up after maxRetries and throws the last error", async () => {
    const { client, requests } = createTestClient(() => json({ error: "boom" }, 500), { maxRetries: 1 });
    await expect(withFakeTimers(() => client.customers.list())).rejects.toBeInstanceOf(InternalServerError);
    expect(requests).toHaveLength(2);
  });

  test.each([408, 429, 500, 502, 503, 504])("retries status %i", async (status) => {
    const { client, requests } = createTestClient((_, i) => (i === 0 ? json({ error: "x" }, status) : json({})));
    await withFakeTimers(() => client.calls.get("c1"));
    expect(requests).toHaveLength(2);
  });

  test.each([400, 401, 403, 404, 409, 422, 501])("does not retry status %i", async (status) => {
    const { client, requests } = createTestClient(() => json({ error: "x" }, status));
    await expect(withFakeTimers(() => client.calls.get("c1"))).rejects.toBeInstanceOf(APIError);
    expect(requests).toHaveLength(1);
  });

  test("retries network errors on idempotent requests", async () => {
    const { client, requests } = createTestClient((_, i) => {
      if (i === 0) throw new TypeError("fetch failed");
      return json({ data: [] });
    });
    await expect(withFakeTimers(() => client.credentials.list())).resolves.toEqual({ data: [] });
    expect(requests).toHaveLength(2);
  });

  type Run = (c: PerfoxClient) => Promise<unknown>;
  test.each<[string, Run]>([
    ["messages.create", (c) => c.messages.create({ to: "+1", from: "+2", text: "hi" })],
    ["outbound.create", (c) => c.outbound.create({ agent_id: "a", channel: "sms", to: "+1" })],
    ["knowledgeBase.uploadFile", (c) => c.knowledgeBase.uploadFile({ file: new File(["x"], "a.txt") })],
    ["knowledgeBase.createFolder", (c) => c.knowledgeBase.createFolder({ name: "f" })],
    ["knowledgeBase.moveFile", (c) => c.knowledgeBase.moveFile("f1", { folder_id: null })],
    ["credentials.register", (c) => c.credentials.register({ name: "n", type: "custom", config: {} })],
    ["mcpServers.update", (c) => c.mcpServers.update("m1", { name: "n" })],
    ["agents.create", (c) => c.agents.create({ name: "a", channels: ["web"] })],
    ["agents.update", (c) => c.agents.update("a1", { name: "b" })],
    ["agents.publish", (c) => c.agents.publish("a1")],
    ["agents.createFromSpec", (c) =>
      c.agents.createFromSpec({ name: "a", persona_name: "M", role: "r", system_prompt: "p" })],
    ["agents.generate", (c) => c.agents.generate({ prompt: "p" })],
    ["support.createTicket", (c) =>
      c.support.createTicket({ subject: "abc", description: "d", category: "platform" })],
    ["support.replyToTicket", (c) => c.support.replyToTicket("t1", { body: "b" })],
    ["templates.sync", (c) => c.templates.sync()],
  ])("never auto-retries non-idempotent %s", async (_, run) => {
    const { client, requests } = createTestClient(() => json({ error: "unavailable" }, 503));
    await expect(withFakeTimers(() => run(client))).rejects.toBeInstanceOf(InternalServerError);
    expect(requests).toHaveLength(1);
  });

  test("non-idempotent network failures are not retried", async () => {
    const { client, requests } = createTestClient(() => {
      throw new TypeError("socket hang up");
    });
    await expect(client.messages.create({ to: "+1", agent_id: "a", text: "hi" })).rejects.toBeInstanceOf(NetworkError);
    expect(requests).toHaveLength(1);
  });

  test("a caller can explicitly opt a non-idempotent call into retries", async () => {
    const { client, requests } = createTestClient((_, i) => (i === 0 ? json({ error: "x" }, 503) : json({ id: "m" })));
    await withFakeTimers(() =>
      client.messages.create({ to: "+1", agent_id: "a", text: "hi" }, { maxRetries: 1 }),
    );
    expect(requests).toHaveLength(2);
  });

  test("per-call maxRetries: 0 disables retries", async () => {
    const { client, requests } = createTestClient(() => json({ error: "x" }, 503));
    await expect(client.customers.list({ maxRetries: 0 })).rejects.toBeInstanceOf(InternalServerError);
    expect(requests).toHaveLength(1);
  });

  test("honours Retry-After (seconds) on 429", async () => {
    vi.useFakeTimers();
    const { client, requests } = createTestClient((_, i) =>
      i === 0 ? json({ error: "rate_limited" }, 429, { "retry-after": "3" }) : json({ data: [] }),
    );
    const promise = client.customers.list();
    await vi.advanceTimersByTimeAsync(2_900);
    expect(requests).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(200);
    await expect(promise).resolves.toEqual({ data: [] });
    expect(requests).toHaveLength(2);
  });

  test("RateLimitError exposes retryAfterMs", async () => {
    const { client } = createTestClient(() => json({ error: "rate_limited" }, 429, { "retry-after": "7" }), {
      maxRetries: 0,
    });
    const error = (await client.customers.list().catch((e: unknown) => e)) as RateLimitError;
    expect(error).toBeInstanceOf(RateLimitError);
    expect(error.retryAfterMs).toBe(7_000);
  });

  test("parseRetryAfter handles seconds, HTTP dates and garbage", () => {
    const now = Date.parse("2026-01-01T00:00:00Z");
    expect(parseRetryAfter("2", now)).toBe(2_000);
    expect(parseRetryAfter("Thu, 01 Jan 2026 00:00:05 GMT", now)).toBe(5_000);
    expect(parseRetryAfter("Wed, 31 Dec 2025 00:00:00 GMT", now)).toBe(0);
    expect(parseRetryAfter("soon", now)).toBeUndefined();
    expect(parseRetryAfter(null, now)).toBeUndefined();
  });
});

describe("timeouts and cancellation", () => {
  /** A fetch that never resolves until its signal aborts. */
  const hangingFetch = (req: { signal: AbortSignal | null | undefined }) =>
    new Promise<Response>((_, reject) => {
      req.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    });

  test("times out with TimeoutError", async () => {
    const { client, requests } = createTestClient((req) => hangingFetch(req), { timeoutMs: 1_000, maxRetries: 0 });
    const error = await withFakeTimers(() => client.customers.list()).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TimeoutError);
    expect(error).toBeInstanceOf(NetworkError);
    expect((error as TimeoutError).timeoutMs).toBe(1_000);
    expect(requests).toHaveLength(1);
  });

  test("timeouts on idempotent calls are retried", async () => {
    const { client, requests } = createTestClient((req) => hangingFetch(req), { timeoutMs: 1_000, maxRetries: 2 });
    await expect(withFakeTimers(() => client.customers.list())).rejects.toBeInstanceOf(TimeoutError);
    expect(requests).toHaveLength(3);
  });

  test("per-call timeout overrides the client default", async () => {
    vi.useFakeTimers();
    const { client } = createTestClient((req) => hangingFetch(req), { timeoutMs: 60_000, maxRetries: 0 });
    const promise = client.customers.list({ timeoutMs: 50 });
    promise.catch(() => undefined);
    await vi.advanceTimersByTimeAsync(60);
    await expect(promise).rejects.toBeInstanceOf(TimeoutError);
  });

  test("the timeout also covers reading the response body", async () => {
    vi.useFakeTimers();
    const { client } = createTestClient(
      (req) =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode("{"));
              req.signal?.addEventListener("abort", () => controller.error(new DOMException("aborted", "AbortError")));
            },
          }),
          { status: 200 },
        ),
      { timeoutMs: 100, maxRetries: 0 },
    );
    const promise = client.customers.list();
    promise.catch(() => undefined);
    await vi.advanceTimersByTimeAsync(150);
    await expect(promise).rejects.toBeInstanceOf(TimeoutError);
  });

  test("caller abort rejects with RequestAbortedError and is not retried", async () => {
    const controller = new AbortController();
    const { client, requests } = createTestClient((req) => {
      setTimeout(() => controller.abort(), 0);
      return hangingFetch(req);
    });
    await expect(client.customers.list({ signal: controller.signal })).rejects.toBeInstanceOf(RequestAbortedError);
    expect(requests).toHaveLength(1);
  });

  test("an already-aborted signal sends nothing", async () => {
    const { client, requests } = createTestClient();
    await expect(client.customers.list({ signal: AbortSignal.abort() })).rejects.toBeInstanceOf(RequestAbortedError);
    expect(requests).toHaveLength(0);
  });

  test("aborting during a retry backoff stops further attempts", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const { client, requests } = createTestClient(() => json({ error: "x" }, 503));
    const promise = client.customers.list({ signal: controller.signal });
    promise.catch(() => undefined);
    await vi.advanceTimersByTimeAsync(0);
    controller.abort();
    await expect(promise).rejects.toBeInstanceOf(RequestAbortedError);
    await vi.runAllTimersAsync();
    expect(requests).toHaveLength(1);
  });

  test("rejects invalid per-call options", async () => {
    const { client } = createTestClient();
    await expect(client.customers.list({ timeoutMs: 0 })).rejects.toBeInstanceOf(InvalidRequestError);
    await expect(client.customers.list({ maxRetries: -1 })).rejects.toBeInstanceOf(InvalidRequestError);
    await expect(client.customers.list({ maxRetries: 1.5 })).rejects.toBeInstanceOf(InvalidRequestError);
  });
});
