// Smoke buildu IIFE (dist odświeżany przez `npm test` = build + testy): global DocsChatClient
// musi nieść pełne publiczne API — to kontrakt dla integracji bez bundlera (Angular.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("IIFE wystawia publiczne API pod globalem DocsChatClient", async () => {
  const code = readFileSync(new URL("../dist/docs-chat-client.iife.js", import.meta.url), "utf8");
  const api = new Function(`${code}; return DocsChatClient;`)();
  const esm = await import("../src/index.mjs");
  for (const name of Object.keys(esm)) {
    assert.ok(name in api, `global nie ma eksportu "${name}"`);
  }
  assert.equal(typeof api.streamDocsChat, "function");
  assert.equal(typeof api.reduceThread, "function");
});
