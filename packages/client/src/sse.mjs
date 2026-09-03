// @ts-check
// Parser strumienia SSE — kontrakt SSE v2 (schemas/):
// liniowy, buforujący; jedna linia `data: <json>` = jedna ramka; parser zwraca obiekt, dispatch
// po `type` robi konsument. Zastępuje dotychczasowe dzielenie po "\n\n" + JSON.parse bez try
// (uszkodzona ramka wywalała cały strumień). Bez React, testowalne w node:test.

/** @typedef {{ title: string, route: string|null, url: string|null, snippet: string, score: number }} SseSource */
/** @typedef {{ type: "sources", sources: SseSource[] }} SseSourcesFrame */
/** @typedef {{ type: "step", id: string, status: "running"|"done"|"failed", meta?: Record<string, unknown> }} SseStepFrame */
/** @typedef {{ type: "reasoning", content: string }} SseReasoningFrame */
/** @typedef {{ type: "content", content: string }} SseContentFrame */
/** @typedef {{ type: "done", traceId: string }} SseDoneFrame */
/** @typedef {{ type: "error", code: "invalid_request"|"rate_limited"|"no_context"|"llm_error", message?: string }} SseErrorFrame */
/** @typedef {SseSourcesFrame|SseStepFrame|SseReasoningFrame|SseContentFrame|SseDoneFrame|SseErrorFrame} SseFrame */

const MAX_LINE_CHARS = 1_000_000; // ramka to kilobajty; megabajtowa „linia" = wadliwy/wrogi backend

/**
 * @returns {(chunkText: string) => Array<Record<string, unknown>>} push — zwraca sparsowane ramki z chunka
 */
export function createSseParser() {
  let buffer = "";

  return function push(chunkText) {
    buffer += chunkText;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    // limit dotyczy NIEDOKOŃCZONEJ linii (jedna ramka), nie chunka z wieloma kompletnymi ramkami
    if (buffer.length > MAX_LINE_CHARS) {
      buffer = "";
      throw new Error("SSE line exceeds the size limit");
    }

    const events = [];
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        events.push(JSON.parse(line.slice(6)));
      } catch {
        // niedomknięty/uszkodzony JSON w pojedynczej linii — pomijamy
      }
    }
    return events;
  };
}
