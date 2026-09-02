// Kontrakt jako dane: przykładowe ramki/żądania (kształty 1:1 z backendu docs-chat) muszą
// walidować się schematami — a znane odchylenia muszą je oblewać.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { Ajv2020 } from "ajv/dist/2020.js";

const ajv = new Ajv2020({ allErrors: true, strict: true });
const schema = (name) => JSON.parse(readFileSync(new URL(`../schemas/${name}`, import.meta.url), "utf8"));
const frame = ajv.compile(schema("sse-frame.schema.json"));
const request = ajv.compile(schema("chat-request.schema.json"));
const status = ajv.compile(schema("status-response.schema.json"));
const chunk = ajv.compile(schema("import-chunk.schema.json"));

test("every frame the backend emits validates against sse-frame.schema.json", () => {
  const valid = [
    { type: "step", id: "retrieve", status: "running" },
    { type: "sources", sources: [{ title: "T", route: "/manual/docs/a", url: "/manual/docs/a", snippet: "s", score: 0.01 }] },
    { type: "sources", sources: [{ title: "T", route: null, url: null, snippet: "s", score: 0 }] },
    { type: "step", id: "retrieve", status: "done", meta: { count: 5 } },
    { type: "step", id: "answer", status: "running", meta: { model: "gemma-4-26b-a4b" } },
    { type: "reasoning", content: "…" },
    { type: "content", content: "Sprawę zakładasz [1]." },
    { type: "step", id: "answer", status: "failed" },
    { type: "done", traceId: "22222222-2222-4222-8222-222222222222" },
    { type: "done", traceId: null },
    { type: "error", code: "rate_limited", message: "Too many requests." },
    { type: "error", code: "no_context" },
  ];
  for (const value of valid) {
    assert.ok(frame(value), `${JSON.stringify(value)}: ${ajv.errorsText(frame.errors)}`);
  }
  const invalid = [
    { type: "done" },
    { type: "error", code: "quota_exceeded" },
    { type: "sources", sources: [{ title: "T" }] },
    { type: "step", id: "retrieve", status: "pending" },
  ];
  for (const value of invalid) {
    assert.equal(frame(value), false, JSON.stringify(value));
  }
});

test("chat request schema matches the handler's validation rules", () => {
  assert.ok(request({ prompt: "Jak założyć sprawę?", scope: "all", client: "dXJ6YWQtMQ==" }));
  assert.ok(request({ prompt: "q", locale: "pl", scope: "page", page: { permalink: "/manual/docs/a", title: "A" } }));
  assert.equal(request({ prompt: "" }), false);
  assert.equal(request({ prompt: "x".repeat(2001) }), false);
  assert.equal(request({ prompt: "q", client: "zł" }), false);
  assert.equal(request({ prompt: "q", page: { permalink: "no-slash" } }), false);
});

test("status and import-chunk schemas accept the real shapes", () => {
  assert.ok(
    status({
      tenant: "ezd", name: "e-Doradca", model: "gemma-4-26b-a4b", locales: ["pl"], observability: true,
      index: [{ locale: "pl", collection: "ezd-docs-pl", importId: null, commitSha: null, activatedAt: null, documents: 0 }],
    })
  );
  assert.ok(chunk({ title: "Akceptacja - part 2/3", text: "…", file_path: null, metadata: { locale: "PL", route: "/manual/docs/a", chunk_index: 1, chunk_count: 3, chunked: true, anchor: "sekcja" } }));
  assert.equal(chunk({ title: "T" }), false);
});
