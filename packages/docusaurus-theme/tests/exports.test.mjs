// Każdy nazwany import z @comtegra/docs-chat-client w źródłach theme'u musi istnieć w eksportach
// paczki — u konsumenta (npm, strict ESM) brakujący eksport = błąd builda, którego testy
// jednostkowe importujące po ścieżkach plików nie łapią.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const srcDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.(js|mjs)$/.test(entry.name)) yield full;
  }
}

test("importy z @comtegra/docs-chat-client pokryte eksportami paczki", async () => {
  const client = await import("@comtegra/docs-chat-client");
  const wanted = new Set();
  for (const file of walk(srcDir)) {
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(/import\s*\{([^}]+)\}\s*from\s*"@comtegra\/docs-chat-client"/g)) {
      for (const raw of match[1].split(",")) {
        const name = raw.trim().split(/\s+as\s+/)[0].trim();
        if (name) wanted.add(name);
      }
    }
  }
  assert.ok(wanted.size >= 5, `podejrzanie mało importów: ${[...wanted].join(", ")}`);
  for (const name of wanted) {
    assert.ok(name in client, `theme importuje "${name}", a @comtegra/docs-chat-client go nie eksportuje`);
  }
});
