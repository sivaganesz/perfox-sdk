import { afterEach, describe, expect, test, vi } from "vitest";
import { InvalidRequestError, PerfoxClient, PlatformClient, workspaceBaseUrl } from "../src/index.js";
import { TEST_API_KEY } from "./helpers.js";

const fetch = async () => new Response("{}");

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("client configuration", () => {
  test("builds the documented server URL from the workspace slug", () => {
    const client = new PerfoxClient({ apiKey: TEST_API_KEY, workspace: "siva-workspace", fetch });
    expect(client.baseUrl).toBe("https://siva-workspace-api.perfox.ai/api/v1");
  });

  test("baseUrl overrides workspace and drops trailing slashes", () => {
    const client = new PerfoxClient({
      apiKey: TEST_API_KEY,
      workspace: "ignored",
      baseUrl: "https://proxy.example.com/perfox/api/v1/",
      fetch,
    });
    expect(client.baseUrl).toBe("https://proxy.example.com/perfox/api/v1");
  });

  test("falls back to environment variables", () => {
    vi.stubEnv("PERFOX_API_KEY", TEST_API_KEY);
    vi.stubEnv("PERFOX_WORKSPACE", "acme");
    expect(new PerfoxClient({ fetch }).baseUrl).toBe("https://acme-api.perfox.ai/api/v1");
  });

  test("PERFOX_BASE_URL is used when no workspace is given", () => {
    vi.stubEnv("PERFOX_API_KEY", TEST_API_KEY);
    vi.stubEnv("PERFOX_BASE_URL", "http://localhost:4000/api/v1");
    expect(new PerfoxClient({ fetch }).baseUrl).toBe("http://localhost:4000/api/v1");
  });

  test("an explicit workspace wins over PERFOX_BASE_URL", () => {
    vi.stubEnv("PERFOX_BASE_URL", "http://localhost:4000/api/v1");
    expect(new PerfoxClient({ apiKey: TEST_API_KEY, workspace: "acme", fetch }).baseUrl).toBe(
      "https://acme-api.perfox.ai/api/v1",
    );
  });

  test.each([
    [{ workspace: "acme" }, /Missing API key/],
    [{ apiKey: "  ", workspace: "acme" }, /Missing API key/],
    [{ apiKey: TEST_API_KEY }, /Missing workspace/],
    [{ apiKey: TEST_API_KEY, workspace: "bad.slug/../" }, /Invalid workspace/],
    [{ apiKey: TEST_API_KEY, baseUrl: "not a url" }, /Invalid baseUrl/],
    [{ apiKey: TEST_API_KEY, baseUrl: "ftp://x/api/v1" }, /http or https/],
    [{ apiKey: TEST_API_KEY, baseUrl: "https://x/api/v1?q=1" }, /query string/],
    [{ apiKey: TEST_API_KEY, workspace: "acme", timeoutMs: 0 }, /timeoutMs/],
    [{ apiKey: TEST_API_KEY, workspace: "acme", maxRetries: -1 }, /maxRetries/],
  ])("rejects invalid options %j", (options, message) => {
    vi.stubEnv("PERFOX_API_KEY", "");
    vi.stubEnv("PERFOX_WORKSPACE", "");
    vi.stubEnv("PERFOX_BASE_URL", "");
    expect(() => new PerfoxClient({ fetch, ...options })).toThrow(InvalidRequestError);
    expect(() => new PerfoxClient({ fetch, ...options })).toThrow(message);
  });

  test("workspaceBaseUrl validates the slug", () => {
    expect(workspaceBaseUrl("a1-b2")).toBe("https://a1-b2-api.perfox.ai/api/v1");
    expect(() => workspaceBaseUrl("-bad")).toThrow(InvalidRequestError);
  });

  test("PlatformClient is an alias of PerfoxClient", () => {
    expect(PlatformClient).toBe(PerfoxClient);
  });

  test("exposes exactly the implemented resources", () => {
    const client = new PerfoxClient({ apiKey: TEST_API_KEY, workspace: "acme", fetch });
    expect(Object.keys(client).sort()).toEqual(
      [
        "agents",
        "analytics",
        "billing",
        "calls",
        "conversations",
        "credentials",
        "customers",
        "knowledgeBase",
        "mcpServers",
        "messages",
        "outbound",
        "support",
        "templates",
        "webhooks",
      ].sort(),
    );
  });
});
