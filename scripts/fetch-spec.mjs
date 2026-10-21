#!/usr/bin/env node
/**
 * Refreshes spec/openapi.json from the public docs and reports operation drift.
 *
 * Usage: node scripts/fetch-spec.mjs [workspace-slug]
 *        (or set PERFOX_WORKSPACE)
 *
 * After refreshing, run `npm run spec:types && npm run spec:inventory && npm test`:
 * the contract tests fail if the SDK no longer matches the documented API.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const specPath = join(root, "spec/openapi.json");
const workspace = process.argv[2] ?? process.env.PERFOX_WORKSPACE;
if (!workspace) {
  console.error("Usage: node scripts/fetch-spec.mjs <workspace-slug>");
  process.exit(1);
}

const url = `https://perfox.ai/api/v1/openapi.json?workspace=${encodeURIComponent(workspace)}`;
const response = await fetch(url, { headers: { Accept: "application/json" } });
if (!response.ok) {
  console.error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  process.exit(1);
}
// Stored verbatim: the snapshot is the source of truth for the SDK contract.
const raw = await response.text();
const next = JSON.parse(raw);

const operations = (spec) =>
  new Set(
    Object.entries(spec.paths).flatMap(([path, item]) =>
      Object.entries(item)
        .filter(([method]) => method !== "parameters")
        .map(([method, op]) => `${op.tags?.[0]} | ${method.toUpperCase()} ${path} | ${op.operationId}`),
    ),
  );

let previous;
try {
  previous = JSON.parse(readFileSync(specPath, "utf8"));
} catch {
  previous = { paths: {} };
}

const before = operations(previous);
const after = operations(next);
const added = [...after].filter((o) => !before.has(o));
const removed = [...before].filter((o) => !after.has(o));

writeFileSync(specPath, raw);
console.log(`Wrote ${specPath} (OpenAPI ${next.openapi}, API ${next.info?.version}).`);
console.log(added.length ? `Added operations:\n  ${added.join("\n  ")}` : "No operations added.");
console.log(removed.length ? `Removed operations:\n  ${removed.join("\n  ")}` : "No operations removed.");
console.log("Field-level changes are caught by: npm run spec:types && npm test");
