// Transport: odporność na strumień ucięty bez końcowego "\n" i na multibyte przecięte
// między chunkami — flush dekodera i parsera po zamknięciu strumienia.
import { test } from "node:test";
import assert from "node:assert/strict";

import { streamDocsChat } from "../src/index.mjs";

function fetchStreaming(chunks) {
  return async () => ({
    ok: true,
    status: 200,
    body: {
      getReader() {
        let i = 0;
        return {
          read: async () => (i < chunks.length ? { done: false, value: chunks[i++] } : { done: true, value: undefined }),
        };
      },
    },
  });
}

const encoder = new TextEncoder();

test("ostatnia linia bez \\n nie przepada (done po flushu, bez syntetycznego błędu)", async () => {
  const events = [];
  await streamDocsChat({
    apiUrl: "https://example.test/chat",
    body: {},
    signal: new AbortController().signal,
    onEvent: (event) => events.push(event),
    fetchImpl: fetchStreaming([
      encoder.encode('data: {"type":"content","content":"abc"}\n'),
      encoder.encode('data: {"type":"done","traceId":"t-1"}'), // proxy ucięło końcowy "\n"
    ]),
  });
  assert.deepEqual(events.map((event) => event.type), ["content", "done"]);
  assert.equal(events[1].traceId, "t-1");
});

test("znak wielobajtowy przecięty między chunkami dekoduje się w całości", async () => {
  const whole = encoder.encode('data: {"type":"content","content":"żółć"}\ndata: {"type":"done","traceId":"t-2"}\n');
  const cut = 30; // w środku sekwencji UTF-8
  const events = [];
  await streamDocsChat({
    apiUrl: "https://example.test/chat",
    body: {},
    signal: new AbortController().signal,
    onEvent: (event) => events.push(event),
    fetchImpl: fetchStreaming([whole.slice(0, cut), whole.slice(cut)]),
  });
  const content = events.filter((event) => event.type === "content").map((event) => event.content).join("");
  assert.equal(content, "żółć");
  assert.equal(events.at(-1).type, "done");
});
