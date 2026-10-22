import { describe, expect, test } from "vitest";
import { APIResource, InvalidRequestError, ValidationError, type RequestOptions } from "../src/index.js";
import { createTestClient, json, jsonBody, queryOf } from "./helpers.js";

describe("conversations.getTranscript", () => {
  test("joins array filters into the documented comma-separated form", async () => {
    const { client, requests } = createTestClient(() => json({ data: [] }));
    await client.conversations.getTranscript("c1", {
      event_type: ["user_message", "ai_response"],
      include: ["tool_io", "files", "structured", "delivery"],
    });
    expect(queryOf(requests[0])).toEqual({
      event_type: "user_message,ai_response",
      include: "tool_io,files,structured,delivery",
    });
  });

  test("passes strings through and omits empty arrays", async () => {
    const { client, requests } = createTestClient(() => json({ data: [] }));
    await client.conversations.getTranscript("c1", { include: "tool_io", event_type: [] });
    expect(queryOf(requests[0])).toEqual({ include: "tool_io" });
  });
});

describe("knowledgeBase.uploadFile", () => {
  async function upload(params: Parameters<ReturnType<typeof createTestClient>["client"]["knowledgeBase"]["uploadFile"]>[0]) {
    const { client, requests } = createTestClient(() => json({ id: "f1", status: "pending" }, 201));
    const result = await client.knowledgeBase.uploadFile(params);
    return { result, form: requests[0]!.body as FormData };
  }

  test("accepts a File and uses its own name and type", async () => {
    const { result, form } = await upload({ file: new File(["hello"], "notes.txt", { type: "text/plain" }) });
    expect(result).toEqual({ id: "f1", status: "pending" });
    const file = form.get("file") as File;
    expect(file.name).toBe("notes.txt");
    expect(file.type).toBe("text/plain");
    expect(await file.text()).toBe("hello");
    expect([...form.keys()]).toEqual(["file"]);
  });

  test("accepts a Buffer / Uint8Array with a filename", async () => {
    const { form } = await upload({
      file: { data: Buffer.from("PDF"), filename: "a.pdf", contentType: "application/pdf" },
      name: "Doc",
    });
    const file = form.get("file") as File;
    expect(file.name).toBe("a.pdf");
    expect(file.type).toBe("application/pdf");
    expect(await file.text()).toBe("PDF");
    expect(form.get("name")).toBe("Doc");
  });

  test("accepts an ArrayBuffer and defaults the content type", async () => {
    const { form } = await upload({ file: { data: new TextEncoder().encode("x").buffer, filename: "x.bin" } });
    expect((form.get("file") as File).type).toBe("application/octet-stream");
  });

  test("copies typed-array views without aliasing their backing buffer", async () => {
    const backing = new Uint8Array([0, 65, 66, 0]);
    const { form } = await upload({ file: { data: backing.subarray(1, 3), filename: "ab.txt" } });
    backing.fill(0);
    expect(await (form.get("file") as File).text()).toBe("AB");
  });

  test("a Blob's type can be overridden", async () => {
    const { form } = await upload({ file: { data: new Blob(["{}"]), filename: "d.json", contentType: "application/json" } });
    expect((form.get("file") as File).type).toBe("application/json");
  });

  test("folder_id: a string is sent; null and undefined are omitted (root)", async () => {
    const file = new File(["x"], "x.txt");
    expect((await upload({ file, folder_id: "fld_1" })).form.get("folder_id")).toBe("fld_1");
    expect((await upload({ file, folder_id: null })).form.has("folder_id")).toBe(false);
    expect((await upload({ file })).form.has("folder_id")).toBe(false);
  });

  test("requires a filename for unnamed data", async () => {
    const { client, requests } = createTestClient();
    await expect(client.knowledgeBase.uploadFile({ file: new Blob(["x"]) })).rejects.toBeInstanceOf(
      InvalidRequestError,
    );
    await expect(
      client.knowledgeBase.uploadFile({ file: { data: new Uint8Array([1]) } }),
    ).rejects.toBeInstanceOf(InvalidRequestError);
    expect(requests).toHaveLength(0);
  });
});

describe("knowledgeBase.moveFile / createFolder", () => {
  test("sends folder_id: null explicitly to move to root", async () => {
    const { client, requests } = createTestClient(() => json({ success: true }));
    await client.knowledgeBase.moveFile("f1", { folder_id: null });
    expect(jsonBody(requests[0])).toEqual({ folder_id: null });
  });
});

describe("messages.create", () => {
  test("sends exactly what the caller composed", async () => {
    const { client, requests } = createTestClient(() =>
      json(
        {
          id: "msg_1",
          conversation_id: "c",
          agent_id: "a",
          channel: "whatsapp",
          to: "+1",
          send_authorized: true,
          status: "sent",
          provider_message_id: "wamid.1",
        },
        201,
      ),
    );
    const res = await client.messages.create({
      to: "+1",
      agent_id: "a",
      media: { type: "audio", url: "https://cdn.example.com/a.ogg" },
    });
    expect(res.status).toBe("sent");
    expect(jsonBody(requests[0])).toEqual({
      to: "+1",
      agent_id: "a",
      media: { type: "audio", url: "https://cdn.example.com/a.ogg" },
    });
  });

  test("compile-time: documented 'exactly one of' rules", () => {
    const { client } = createTestClient();
    const never = (fn: () => unknown) => fn; // type-only checks, not executed
    never(() => {
      // @ts-expect-error -- both `text` and `template`
      void client.messages.create({ to: "+1", from: "+2", text: "a", template: { name: "t" } });
      // @ts-expect-error -- both `from` and `agent_id`
      void client.messages.create({ to: "+1", from: "+2", agent_id: "a", text: "a" });
      // @ts-expect-error -- no content
      void client.messages.create({ to: "+1", from: "+2" });
      // @ts-expect-error -- no sender
      void client.messages.create({ to: "+1", text: "a" });
      // @ts-expect-error -- audio takes no caption
      void client.messages.create({ to: "+1", from: "+2", media: { type: "audio", url: "u", caption: "c" } });
      // @ts-expect-error -- filename applies to documents only
      void client.messages.create({ to: "+1", from: "+2", media: { type: "image", url: "u", filename: "f" } });
    });
    expect(true).toBe(true);
  });
});

describe("calls.getRecordings", () => {
  test("uses the conversation recordings path", async () => {
    const { client, requests } = createTestClient(() =>
      json({ conversation_id: "conv_1", expires_in_seconds: 300, recordings: [] }),
    );
    await client.calls.getRecordings("conv_1");
    expect(requests[0]!.url.pathname).toBe("/api/v1/conversations/conv_1/recordings");
  });
});

describe("agents.publish", () => {
  test("an unpublishable agent surfaces the 422 details as ValidationError", async () => {
    const body = {
      error: "not_publishable",
      message: "Agent failed publish gates",
      // Shape not documented; whatever the server sends is preserved verbatim.
      details: [{ node_id: "n2", issue: "missing chat_model" }],
    };
    const { client, requests } = createTestClient(() => json(body, 422));
    const error = (await client.agents.publish("agt_1").catch((e: unknown) => e)) as ValidationError;
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.code).toBe("not_publishable");
    expect(error.body).toEqual(body);
    expect(requests[0]!.body).toBeUndefined();
  });
});

describe("extensibility", () => {
  test("a custom resource reuses the client's transport", async () => {
    class Support extends APIResource {
      listTickets(options?: RequestOptions) {
        return this._request<{ data: unknown[] }>({ method: "GET", path: "/support/tickets", idempotent: true }, options);
      }
    }
    const { client, requests } = createTestClient(() => json({ data: [] }));
    await client.resource(Support).listTickets();
    expect(requests[0]!.url.pathname).toBe("/api/v1/support/tickets");
    expect(requests[0]!.headers.get("authorization")).toMatch(/^Bearer sk_/);
  });
});
