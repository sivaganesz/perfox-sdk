import { describe, expect, test } from "vitest";
import { Paginator } from "../src/index.js";
import { createTestClient, json, queryOf } from "./helpers.js";

describe("cursor pagination", () => {
  test("messages.iterate follows next_cursor until it is absent", async () => {
    const pages = [
      { messages: [{ id: "m1" }, { id: "m2" }], next_cursor: "c2" },
      { messages: [{ id: "m3" }], next_cursor: "c3" },
      { messages: [{ id: "m4" }] },
    ];
    const { client, requests } = createTestClient((_, i) => json(pages[i]));
    const ids: string[] = [];
    for await (const message of client.messages.iterate({ status: "delivered", limit: 2 })) ids.push(message.id);

    expect(ids).toEqual(["m1", "m2", "m3", "m4"]);
    expect(requests.map(queryOf)).toEqual([
      { status: "delivered", limit: "2" },
      { status: "delivered", limit: "2", cursor: "c2" },
      { status: "delivered", limit: "2", cursor: "c3" },
    ]);
  });

  test("starts from a caller-supplied cursor", async () => {
    const { client, requests } = createTestClient(() => json({ data: [] }));
    await client.calls.iterate({ cursor: "resume-here" }).toArray();
    expect(queryOf(requests[0])).toEqual({ cursor: "resume-here" });
  });

  test("is lazy: nothing is fetched until iteration starts", async () => {
    const { client, requests } = createTestClient(() => json({ data: [] }));
    const paginator = client.knowledgeBase.iterateFiles();
    expect(requests).toHaveLength(0);
    await paginator.toArray();
    expect(requests).toHaveLength(1);
  });

  test("toArray({ maxItems }) stops fetching once enough items are collected", async () => {
    const { client, requests } = createTestClient((_, i) =>
      json({ data: [{ conversation_id: `c${i}a` }, { conversation_id: `c${i}b` }], next_cursor: `n${i + 1}` }),
    );
    const calls = await client.calls.iterate().toArray({ maxItems: 3 });
    expect(calls.map((c) => c.conversation_id)).toEqual(["c0a", "c0b", "c1a"]);
    expect(requests).toHaveLength(2);
  });

  test("pages() yields whole responses", async () => {
    const pages = [{ conversations: [{ id: "a" }], next_cursor: "x" }, { conversations: [{ id: "b" }] }];
    const { client } = createTestClient((_, i) => json(pages[i]));
    const seen = [];
    for await (const page of client.customers.iterateConversations("cus_1").pages()) seen.push(page);
    expect(seen).toEqual(pages);
  });

  test("stops if the server repeats a cursor (no infinite loop)", async () => {
    const { client, requests } = createTestClient(() => json({ data: [{ id: "f" }], next_cursor: "same" }));
    const files = await client.knowledgeBase.iterateFiles().toArray();
    expect(files).toHaveLength(2);
    expect(requests).toHaveLength(2);
  });

  test("stops on an empty page even if a cursor is returned", async () => {
    const { client, requests } = createTestClient(() => json({ messages: [], next_cursor: "more" }));
    await client.messages.iterate().toArray();
    expect(requests).toHaveLength(1);
  });

  test("errors propagate out of iteration", async () => {
    const { client } = createTestClient((_, i) =>
      i === 0 ? json({ data: [{ id: "1" }], next_cursor: "c" }) : json({ error: "not_found" }, 404),
    );
    await expect(client.knowledgeBase.iterateFiles().toArray()).rejects.toThrow(/404 not_found/);
  });
});

describe("transcript (timestamp) pagination", () => {
  test("follows next_after while has_more is true", async () => {
    const pages = [
      { data: [{ id: "e1" }], has_more: true, next_after: "2026-01-01T00:00:01Z" },
      { data: [{ id: "e2" }], has_more: false, next_after: "2026-01-01T00:00:02Z" },
    ];
    const { client, requests } = createTestClient((_, i) => json(pages[i]));
    const events = await client.conversations
      .iterateTranscript("conv_1", { limit: 1, include: ["tool_io", "files"], event_type: "user_message" })
      .toArray();
    expect(events.map((e) => e.id)).toEqual(["e1", "e2"]);
    expect(requests.map(queryOf)).toEqual([
      { limit: "1", include: "tool_io,files", event_type: "user_message" },
      { limit: "1", include: "tool_io,files", event_type: "user_message", after: "2026-01-01T00:00:01Z" },
    ]);
  });

  test("stops when next_after is missing", async () => {
    const { client, requests } = createTestClient(() => json({ data: [{ id: "e1" }] }));
    await client.conversations.iterateTranscript("conv_1").toArray();
    expect(requests).toHaveLength(1);
  });
});

describe("Paginator", () => {
  test("toArray({ maxItems: 0 }) fetches nothing", async () => {
    let fetched = 0;
    const paginator = new Paginator(
      async () => {
        fetched++;
        return { items: [1, 2] };
      },
      (p) => p.items,
      () => undefined,
    );
    await expect(paginator.toArray({ maxItems: 0 })).resolves.toEqual([]);
    expect(fetched).toBe(0);
  });
});
