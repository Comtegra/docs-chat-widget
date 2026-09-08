// Token strony: nagłówki własne przechodzą do fetch, odpowiedź 401/403 kończy się DocsChatRequestError
// ze statusem (widget mapuje na notice `unauthorized`), reducer zna ten kod.
import { test } from "node:test";
import assert from "node:assert/strict";

import { DocsChatRequestError, SITE_TOKEN_HEADER, noticeForErrorCode, reduce, initialState, streamDocsChat } from "../src/index.mjs";

test("streamDocsChat: własne nagłówki trafiają do fetch, Content-Type zostaje JSON", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return {
      ok: true,
      status: 200,
      body: { getReader: () => ({ read: async () => ({ done: true, value: undefined }) }) },
    };
  };
  await streamDocsChat({
    apiUrl: "https://example.test/chat",
    body: { prompt: "q" },
    signal: new AbortController().signal,
    onEvent: () => {},
    headers: { [SITE_TOKEN_HEADER]: "tok-1", "Content-Type": "text/plain" },
    fetchImpl,
  });
  assert.equal(SITE_TOKEN_HEADER, "X-Site-Token");
  assert.deepEqual(calls[0].init.headers, { "X-Site-Token": "tok-1", "Content-Type": "application/json" });
});

test("streamDocsChat: 401 bez strumienia rzuca DocsChatRequestError ze statusem (bez ramek do onEvent)", async () => {
  const events = [];
  await assert.rejects(
    streamDocsChat({
      apiUrl: "https://example.test/chat",
      body: {},
      signal: new AbortController().signal,
      onEvent: (event) => events.push(event),
      fetchImpl: async () => ({ ok: false, status: 401, body: null }),
    }),
    (error) => error instanceof DocsChatRequestError && error.status === 401 && /401/.test(error.message)
  );
  assert.deepEqual(events, []);
});

test("noticeForErrorCode: unauthorized jest osobnym notice, reducer przyjmuje go jak inne błędy", () => {
  assert.equal(noticeForErrorCode("unauthorized"), "unauthorized");
  assert.equal(noticeForErrorCode("llm_error"), "error");
  let state = reduce(initialState, { type: "start", prompt: "q", at: 1 });
  state = reduce(state, { type: "error", code: "unauthorized", at: 2 });
  assert.equal(state.status, "error");
  assert.equal(state.notice, "unauthorized");
});
