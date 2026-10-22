/**
 * The README's examples, compiled as part of `npm run typecheck` so the docs
 * can't drift from the SDK. Not executed by the test suite (it would call the live API).
 */
import { readFile } from "node:fs/promises";
import {
  APIResource,
  buildPath,
  ConflictError,
  PerfoxClient,
  ValidationError,
  type RequestOptions,
} from "../src/index.js";

/** Stand-in for your secret store. */
declare function saveSecretSomewhereSafe(secret: string): void;

export async function main(workspace: string): Promise<void> {
  const perfox = new PerfoxClient({
    apiKey: process.env.PERFOX_API_KEY,
    workspace,
  });

  // Customers
  const customer = await perfox.customers.create({
    name: "Asha",
    phone: "+91 98765 43210",
    external_id: "user-42",
  });
  const details = await perfox.customers.getDetails(customer.id);
  console.log(details.insights.resolution.resolution_rate);

  try {
    await perfox.customers.link({
      external_id: "user-42",
      identifiers: { email: "asha@example.com", name: "Asha" },
    });
  } catch (error) {
    if (error instanceof ConflictError && error.code === "link_conflict") {
      // An existing link to a different external_id matches — delete it first.
    }
  }

  // Transcript
  const conversationId = "conv_123";
  for await (const event of perfox.conversations.iterateTranscript(conversationId, {
    include: ["tool_io", "delivery"],
  })) {
    console.log(event.actor, event.text);
  }

  // Knowledge Base upload
  const file = await perfox.knowledgeBase.uploadFile({
    file: { data: await readFile("refunds.pdf"), filename: "refunds.pdf", contentType: "application/pdf" },
    name: "Refund policy",
  });
  console.log(file.status);

  // Messages
  const sent = await perfox.messages.create({
    to: "+919876543210",
    from: "+911234567890",
    template: { name: "order_update", language: "en_US", body_parameters: ["Asha", "#123"] },
  });
  const message = await perfox.messages.get(sent.id);
  console.log(message.status, message.status_history);

  // Pagination
  const controller = new AbortController();
  await perfox.calls.list({ limit: 50 }, { signal: controller.signal, timeoutMs: 10_000 });
  for await (const call of perfox.calls.iterate({ status: "completed" })) {
    console.log(call.conversation_id, call.duration_seconds);
  }
  for await (const page of perfox.messages.iterate({ limit: 200 }).pages()) {
    console.log(page.messages.length);
  }
  const first500 = await perfox.knowledgeBase.iterateFiles().toArray({ maxItems: 500 });
  console.log(first500.length);

  // Agents
  const agent = await perfox.agents.createFromSpec({
    name: "Maya",
    persona_name: "Maya",
    role: "Support Agent",
    system_prompt: "You help customers track and change their orders.",
    channel: "whatsapp",
  });
  try {
    await perfox.agents.publish(agent.id);
  } catch (error) {
    if (error instanceof ValidationError) console.error(error.body);
  }

  // Templates
  const { templates } = await perfox.templates.list();
  const sendable = templates.filter((t) => t.status === "approved");
  console.log(sendable.length);

  // Webhooks
  const sub = await perfox.webhooks.create({
    url: "https://example.com/perfox-hook",
    events: ["message.inbound", "message.status"],
  });
  saveSecretSomewhereSafe(sub.secret);

  // Extending
  class Widgets extends APIResource {
    async get(id: string, options?: RequestOptions) {
      return this._request<{ id: string }>(
        { method: "GET", path: buildPath("/widgets/{id}", { id }), idempotent: true },
        options,
      );
    }
  }
  const widgets = perfox.resource(Widgets);
  void widgets;
}
