// Testy behawioralne kontraktu klienta — przeniesione z repo docs CGC (część dotycząca
// protokołu/stanu; testy UI theme'u żyją przy paczce theme'u).
import assert from "node:assert/strict";
import test from "node:test";

import {
  CITATION_HREF_PREFIX,
  annotateCitations,
  citationNumberFromHref,
  citedSourceNumbers,
  parseCitations,
  sourceCardId,
} from "../src/citations.mjs";
import { sanitizeMarkdownHref } from "../src/safeHref.mjs";
import { streamDocsChat } from "../src/transport.mjs";
import { createSseParser } from "../src/sse.mjs";
import {
  initialState,
  initialThreadState,
  noticeForErrorCode,
  reduce,
  reduceThread,
  threadSelectors,
  turnDurationMs,
} from "../src/conversation.mjs";

// --- citations ----------------------------------------------------------------------------------

test("parseCitations: [n] within range becomes a cite segment; out of range / zero stay text", () => {
  assert.deepEqual(parseCitations("Use cgc volume create [2]. Also [7] and [0].", 3), [
    { type: "text", value: "Use cgc volume create " },
    { type: "cite", n: 2 },
    { type: "text", value: ". Also [7] and [0]." },
  ]);
  assert.deepEqual(parseCitations("no cites here", 3), [{ type: "text", value: "no cites here" }]);
  assert.deepEqual(parseCitations("[1] with zero sources", 0), [{ type: "text", value: "[1] with zero sources" }]);
});

test("parseCitations: brackets inside inline code and fences are never citations; [1]: url is a ref-def", () => {
  const text = "arr `[1]` and\n```js\nconst x = arr[1];\n```\nreal [1] and [2]: http://x";
  const segs = parseCitations(text, 2);
  assert.deepEqual(segs.filter((s) => s.type === "cite"), [{ type: "cite", n: 1 }]);
  assert.equal(segs.map((s) => (s.type === "text" ? s.value : `<${s.n}>`)).join(""),
    "arr `[1]` and\n```js\nconst x = arr[1];\n```\nreal <1> and [2]: http://x");
});

test("citedSourceNumbers: unique, in order of first appearance", () => {
  assert.deepEqual(citedSourceNumbers("a [3] b [1] c [3] d [9]", 5), [3, 1]);
});

// --- sse ----------------------------------------------------------------------------------------

test("sse parser: line-based, buffers split frames, skips broken JSON and non-data lines", () => {
  const parse = createSseParser();
  assert.deepEqual(parse('data: {"type":"step","id":"retrieve","status":"running"}\n\ndata: {"type":"con'), [
    { type: "step", id: "retrieve", status: "running" },
  ]);
  assert.deepEqual(parse('tent","content":"Hi"}\n:keep-alive\ndata: {broken\ndata: {"type":"done","traceId":"t"}\n'), [
    { type: "content", content: "Hi" },
    { type: "done", traceId: "t" },
  ]);
});

// --- thread reducer -----------------------------------------------------------------------------

test("reduceThread: start appends a turn, frames patch the LAST turn, clear/restore", () => {
  let s = reduceThread(initialThreadState, { type: "start", id: "t1", prompt: "q1", scope: "page" });
  s = reduceThread(s, { type: "content", content: "a1" });
  s = reduceThread(s, { type: "done", traceId: "tr-1" });
  s = reduceThread(s, { type: "start", id: "t2", prompt: "q2", scope: "all" });
  s = reduceThread(s, { type: "step", id: "retrieve", status: "running" });
  assert.equal(s.turns.length, 2);
  assert.equal(s.turns[0].turn.answer, "a1");
  assert.equal(s.turns[0].turn.status, "done");
  assert.equal(s.turns[0].scope, "page");
  assert.equal(s.turns[1].turn.status, "running");
  assert.deepEqual(s.turns[1].turn.steps, [{ id: "retrieve", status: "running" }]);
  assert.equal(threadSelectors.loading(s), true);
  // frame that changes nothing → same state reference (no re-render churn)
  assert.equal(reduceThread(s, { type: "reasoning", content: "" }), s);
  assert.deepEqual(reduceThread(s, { type: "clear" }), { turns: [] });
  // restore przyjmuje tylko tury zakończone (persistable nigdy nie zapisuje `running`)
  const restored = reduceThread(initialThreadState, { type: "restore", turns: s.turns });
  assert.equal(restored.turns.length, 1);
  assert.equal(restored.turns[0].id, "t1");
  const restoredAll = reduceThread(initialThreadState, { type: "restore", turns: threadSelectors.persistable(reduceThread(s, { type: "abort", reason: "stopped" })) });
  assert.equal(restoredAll.turns.length, 2);
});

test("reduceThread: frames with no turn are ignored; persistable drops reasoning and running turns", () => {
  assert.equal(reduceThread(initialThreadState, { type: "content", content: "x" }), initialThreadState);
  let s = reduceThread(initialThreadState, { type: "start", id: "t1", prompt: "q", scope: "all" });
  s = reduceThread(s, { type: "reasoning", content: "think" });
  s = reduceThread(s, { type: "content", content: "ans" });
  assert.deepEqual(threadSelectors.persistable(s), []);
  s = reduceThread(s, { type: "done", traceId: "tr" });
  const p = threadSelectors.persistable(s);
  assert.equal(p.length, 1);
  assert.equal(p[0].turn.reasoning, "");
  assert.equal(p[0].turn.answer, "ans");
  assert.equal(p[0].turn.traceId, "tr");
});

test("turn reducer contract sanity (same as the backend): unsafe→done, error→failed step, late frames ignored", () => {
  const started = reduce(initialState, { type: "start", prompt: "q" });
  const err = reduce(reduce(started, { type: "step", id: "answer", status: "running" }), { type: "error", code: "llm_error" });
  assert.equal(err.status, "error");
  assert.deepEqual(err.steps, [{ id: "answer", status: "failed" }]);
  assert.equal(reduce(err, { type: "content", content: "late" }).answer, "");
});

// --- citations → markdown links (chipy przez override `a`) ---------------------------------------

test("annotateCitations: valid [n] become [n](#docs-chat-source-n); code, out-of-range and ref-defs untouched", () => {
  assert.equal(annotateCitations("See [1] and [2].", 2), "See [1](#docs-chat-source-1) and [2](#docs-chat-source-2).");
  assert.equal(annotateCitations("See [3].", 2), "See [3].");
  assert.equal(annotateCitations("`arr[1]` and\n```\nx[1]\n```\n[1]: http://x", 2), "`arr[1]` and\n```\nx[1]\n```\n[1]: http://x");
  assert.equal(annotateCitations("", 2), "");
  assert.equal(annotateCitations("no cites", 0), "no cites");
  // idempotentne: już zaanotowany `[1](#…)` = link ⇒ pomijany (kontekst „przed `(`")
  const once = annotateCitations("See [1].", 1);
  assert.equal(annotateCitations(once, 1), once);
});

test("annotateCitations never corrupts markdown structure : indented/quoted fences, link text, refs, URLs, alt", () => {
  const cases = [
    "10. step\n    ```py\n    print(sys.argv[1])\n    ```\nok",
    "- a\n  - b\n    ~~~\n    x[1]\n    ~~~",
    "> ```\n> x[1]\n> ```",
    "[Installation guide [1]](/x)",
    "![alt [1]](/i.png)",
    "[text][1] and [1]: http://x",
    "[1](http://u)",
    "[1][ref]",
    "[text][2]",
    "https://x/[1] and [foo](/a[1]b)",
    "www.x.com/[1]",
  ];
  for (const text of cases) {
    assert.equal(annotateCitations(text, 3), text, text);
  }
  // sąsiednie cytowania `[1][2]` (częste u LLM) — oba w zakresie → oba chipy
  assert.equal(annotateCitations("Text [1][2].", 2), "Text [1](#docs-chat-source-1)[2](#docs-chat-source-2).");
  // …ale poprawne cytowanie w tej samej linii nadal działa
  assert.equal(annotateCitations("[Guide](/x) says [1].", 1), "[Guide](/x) says [1](#docs-chat-source-1).");
  assert.equal(annotateCitations("See https://x/y then [1].", 1), "See https://x/y then [1](#docs-chat-source-1).");
});

test("citationNumberFromHref / sourceCardId round trip", () => {
  assert.equal(CITATION_HREF_PREFIX, "#docs-chat-source-");
  assert.equal(citationNumberFromHref("#docs-chat-source-3"), 3);
  assert.equal(citationNumberFromHref("#docs-chat-source-0"), null);
  assert.equal(citationNumberFromHref("#docs-chat-source-x"), null);
  assert.equal(citationNumberFromHref("/docs/x"), null);
  assert.equal(citationNumberFromHref(undefined), null);
  assert.equal(sourceCardId("turn-1", 2), "docs-chat-source-turn-1-2");
});

// --- thread timing ------------------------------------------------------------------------------

test("reduceThread: startedAt/finishedAt from event `at`; turnDurationMs null while running (unless now given) and for legacy snapshots", () => {
  let thread = reduceThread(initialThreadState, { type: "start", id: "t1", prompt: "q", scope: "all", at: 1000 });
  assert.equal(thread.turns[0].startedAt, 1000);
  assert.equal(thread.turns[0].finishedAt, null);
  assert.equal(turnDurationMs(thread.turns[0]), null);
  assert.equal(turnDurationMs(thread.turns[0], 1500), 500);
  thread = reduceThread(thread, { type: "content", content: "a" });
  thread = reduceThread(thread, { type: "done", traceId: "tr", at: 4200 });
  assert.equal(thread.turns[0].finishedAt, 4200);
  assert.equal(turnDurationMs(thread.turns[0]), 3200);
  // abort/error also close the turn with `at`
  let t2 = reduceThread(initialThreadState, { type: "start", id: "t2", prompt: "q", scope: "all", at: 10 });
  t2 = reduceThread(t2, { type: "abort", reason: "stopped", at: 60 });
  assert.equal(turnDurationMs(t2.turns[0]), 50);
  let t3 = reduceThread(initialThreadState, { type: "start", id: "t3", prompt: "q", scope: "all", at: 10 });
  t3 = reduceThread(t3, { type: "error", code: "llm_error", at: 30 });
  assert.equal(turnDurationMs(t3.turns[0]), 20);
  // legacy snapshot without timestamps
  const restored = reduceThread(initialThreadState, {
    type: "restore",
    turns: [{ id: "old", prompt: "q", scope: "all", turn: { ...initialState, status: "done", answer: "a" } }],
  });
  assert.equal(turnDurationMs(restored.turns[0]), null);
  // persisted turns carry the timestamps
  const persisted = threadSelectors.persistable(thread);
  assert.equal(persisted[0].startedAt, 1000);
  assert.equal(persisted[0].finishedAt, 4200);
});

// --- format / code language ---------------------------------------------------------------------

// --- reducer behaviour (contract claims that were untested) ------------------------------------

test("reduce: `sources` identity survives content frames; done{traceId:null}; frames after done/abort ignored", () => {
  let s = reduce(initialState, { type: "start", prompt: "q" });
  const sources = [{ title: "A", route: "/a", url: "/a", snippet: "", score: 1 }];
  s = reduce(s, { type: "sources", sources });
  s = reduce(s, { type: "content", content: "x" });
  s = reduce(s, { type: "content", content: "y" });
  assert.equal(s.sources, sources); // ta sama instancja (React.memo)
  s = reduce(s, { type: "done", traceId: null });
  assert.equal(s.status, "done");
  assert.equal(s.traceId, null);
  const frozen = s;
  assert.equal(reduce(frozen, { type: "content", content: "late" }), frozen);
  assert.equal(reduce(frozen, { type: "step", id: "answer", status: "running" }), frozen);
  assert.equal(reduce(frozen, { type: "error", code: "llm_error" }), frozen);
  assert.equal(reduce(frozen, { type: "abort", reason: "stopped" }), frozen);
});

test("noticeForErrorCode: server + client codes map to notices, unknown → error", () => {
  for (const [code, notice] of [
    ["unsafe", "unsafe"], ["pricing", "pricing"], ["rate_limited", "rate_limited"], ["no_context", "no_context"],
    // `timeout` nie jest kodem serwera — to `abort{reason:"timeout"}`; jako error code → "error"
    ["timeout", "error"], ["llm_error", "error"], ["invalid_request", "error"], ["whatever", "error"], [undefined, "error"],
  ]) {
    assert.equal(noticeForErrorCode(code), notice, String(code));
  }
});

test("reduceThread restore: malformed snapshots are dropped, valid turns kept", () => {
  const good = { id: "t1", prompt: "q", scope: "all", turn: { ...initialState, status: "done", answer: "a" } };
  const thread = reduceThread(initialThreadState, {
    type: "restore",
    turns: [
      good, null, "x", { id: "t2" },
      { id: "t3", prompt: "q", scope: "all", turn: { status: "done" } },
      { ...good, id: "t4", turn: { ...good.turn, steps: "nope" } },
      { ...good, id: "t5", turn: { ...good.turn, status: "running" } }, // zawieszony panel bez kontrolera
      { ...good, id: "t6", turn: { ...good.turn, steps: [null] } }, // TypeError w widoku
      { ...good, id: "t7", turn: { ...good.turn, steps: [{ id: "x", status: "weird" }] } },
      { ...good, id: "t8", turn: { ...good.turn, sources: [1] } },
    ],
  });
  assert.deepEqual(thread.turns.map((t) => t.id), ["t1"]);
  assert.deepEqual(reduceThread(initialThreadState, { type: "restore", turns: "garbage" }), initialThreadState);
});

// --- safeHref -----------------------------------------------------------------------------------

test("sanitizeMarkdownHref: /, #, http(s), mailto pass; javascript:, data:, protocol-relative and backslash hosts are dropped", () => {
  for (const ok of ["/docs/x", "#anchor", "https://a.b/c", "HTTP://a.b", "mailto:x@y.z"]) assert.equal(sanitizeMarkdownHref(ok), ok);
  for (const bad of ["javascript:alert(1)", "data:text/html,x", "//evil.com/x", "/\\evil.com/x", "\\\\evil", "vbscript:x", "", undefined, "  //evil", "/\t/evil.com", "java\nscript:x"]) {
    assert.equal(sanitizeMarkdownHref(bad), "", String(bad));
  }
});

// --- transport (fake fetch + ReadableStream) ----------------------------------------------------

/** @param {string[]} chunks @param {{ ok?: boolean, status?: number }} [init] */
function fakeFetch(chunks, init = {}) {
  return async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    });
    return new Response(body, { status: init.status ?? 200 });
  };
}

test("streamDocsChat: dispatches frames by type, adds `at` to done/error, calls onActivity per chunk", async () => {
  const events = [];
  let activity = 0;
  await streamDocsChat({
    apiUrl: "http://x/completion",
    body: { prompt: "q" },
    signal: new AbortController().signal,
    onEvent: (e) => events.push(e),
    onActivity: () => { activity += 1; },
    fetchImpl: fakeFetch([
      'data: {"type":"step","id":"retrieve","status":"running"}\n\n',
      'data: {"type":"sources","sources":[]}\ndata: {"type":"content","content":"Hi"}\n\n',
      'data: {"type":"weird"}\ndata: {"type":"done","traceId":"t1"}\n\n',
    ]),
    now: () => 42,
  });
  assert.deepEqual(events, [
    { type: "step", id: "retrieve", status: "running" },
    { type: "sources", sources: [] },
    { type: "content", content: "Hi" },
    { type: "done", traceId: "t1", at: 42 },
  ]);
  assert.ok(activity >= 4, `activity ${activity}`); // po fetch + 3 chunki
});

test("streamDocsChat: stream closed without done/error → synthetic llm_error; error frame keeps its code; done{traceId:null}", async () => {
  const cut = [];
  await streamDocsChat({ apiUrl: "u", body: {}, signal: new AbortController().signal, onEvent: (e) => cut.push(e), fetchImpl: fakeFetch(['data: {"type":"content","content":"partial"}\n\n']), now: () => 1 });
  assert.deepEqual(cut, [{ type: "content", content: "partial" }, { type: "error", code: "llm_error", at: 1 }]);
  const errored = [];
  await streamDocsChat({ apiUrl: "u", body: {}, signal: new AbortController().signal, onEvent: (e) => errored.push(e), fetchImpl: fakeFetch(['data: {"type":"error","code":"rate_limited"}\n\n']), now: () => 2 });
  assert.deepEqual(errored, [{ type: "error", code: "rate_limited", at: 2 }]);
  const nullTrace = [];
  await streamDocsChat({ apiUrl: "u", body: {}, signal: new AbortController().signal, onEvent: (e) => nullTrace.push(e), fetchImpl: fakeFetch(['data: {"type":"done"}\n\n']), now: () => 3 });
  assert.deepEqual(nullTrace, [{ type: "done", traceId: null, at: 3 }]);
});

test("streamDocsChat: HTTP error throws (hook maps to llm_error); abort rejects with the fetch error", async () => {
  await assert.rejects(
    streamDocsChat({ apiUrl: "u", body: {}, signal: new AbortController().signal, onEvent: () => {}, fetchImpl: fakeFetch([], { status: 500 }) }),
    /Docs chat request failed \(500\)/
  );
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    streamDocsChat({ apiUrl: "u", body: {}, signal: controller.signal, onEvent: () => {}, fetchImpl: async (_url, init) => { init.signal.throwIfAborted(); return new Response(""); } })
  );
});
