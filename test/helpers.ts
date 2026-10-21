import { PerfoxClient, type ClientOptions } from "../src/index.js";

export interface RecordedRequest {
  url: URL;
  method: string;
  headers: Headers;
  body: BodyInit | null | undefined;
  signal: AbortSignal | null | undefined;
}

export type Handler = (req: RecordedRequest, callIndex: number) => Response | Promise<Response>;

export const TEST_API_KEY = `sk_${"ab".repeat(32)}`;
export const TEST_BASE_URL = "https://acme-api.perfox.ai/api/v1";

/** Builds a JSON Response. */
export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

/** A client wired to a recording fake `fetch`. */
export function createTestClient(handler: Handler = () => json({}), options: ClientOptions = {}) {
  const requests: RecordedRequest[] = [];
  const fetch = async (input: string, init: RequestInit): Promise<Response> => {
    const req: RecordedRequest = {
      url: new URL(input),
      method: init.method ?? "GET",
      headers: new Headers(init.headers),
      body: init.body,
      signal: init.signal,
    };
    requests.push(req);
    return handler(req, requests.length - 1);
  };
  const client = new PerfoxClient({ apiKey: TEST_API_KEY, workspace: "acme", fetch, ...options });
  return { client, requests };
}

/** Parses the JSON body of a recorded request. */
export function jsonBody(req: RecordedRequest | undefined): unknown {
  if (!req || typeof req.body !== "string") throw new Error("request has no JSON body");
  return JSON.parse(req.body);
}

/** Query parameters of a recorded request as a plain object. */
export function queryOf(req: RecordedRequest | undefined): Record<string, string> {
  if (!req) throw new Error("no request recorded");
  return Object.fromEntries(req.url.searchParams.entries());
}
