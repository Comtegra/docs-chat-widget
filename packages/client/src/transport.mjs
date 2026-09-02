// @ts-check
// Transport asystenta dokumentacji bez React : POST → strumień SSE v2 → zdarzenia do reducera.
// Hook useDocsChat dokłada tylko: AbortController, timeout nieaktywności (onActivity) i bramkę
// „bieżące żądanie" (onEvent = emit). Testowalne w node:test z fałszywym `fetch`/ReadableStream.
import { createSseParser } from "./sse.mjs";

/**
 * @param {{
 *   apiUrl: string,
 *   body: unknown,
 *   signal: AbortSignal,
 *   onEvent: (event: any) => void,       // ramki + `error`/`done` z `at`
 *   onActivity?: () => void,             // każdy chunk odpowiedzi (zerowanie timeoutu)
 *   fetchImpl?: typeof fetch,
 *   now?: () => number,
 * }} options
 * @returns {Promise<void>}  rozwiązuje po `done`/`error`; rzuca przy błędzie HTTP/sieci (nie przy abort)
 */
export async function streamDocsChat({ apiUrl, body, signal, onEvent, onActivity = () => {}, fetchImpl = fetch, now = Date.now }) {
  const response = await fetchImpl(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  onActivity();

  if (!response.ok || !response.body) {
    throw new Error(`Docs chat request failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parse = createSseParser();
  let sawDone = false;
  let sawError = false;

  /** @param {Record<string, any>} event sparsowana ramka z parsera SSE */
  const handleFrame = (event) => {
    switch (event.type) {
      case "sources":
      case "step":
      case "reasoning":
      case "content":
        onEvent(event);
        break;
      case "error":
        sawError = true;
        onEvent({ type: "error", code: typeof event.code === "string" && event.code ? event.code : "llm_error", at: now() });
        break;
      case "done":
        sawDone = true;
        onEvent({ type: "done", traceId: typeof event.traceId === "string" ? event.traceId : null, at: now() });
        break;
      default:
        break; // nieznane typy ramek — ignorowane (forward compat)
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onActivity();
    for (const event of parse(decoder.decode(value, { stream: true }))) handleFrame(event);
  }
  // flush: resztka multibyte w dekoderze i ostatnia linia bez "\n" (proxy tnące strumień zaraz
  // po ramce `done`) — dopychamy "\n", żeby parser oddał zbuforowaną linię
  for (const event of parse(decoder.decode() + "\n")) handleFrame(event);
  // kontrakt: `done` jest ZAWSZE — strumień zamknięty bez `done` i bez `error` (proxy uciął) = błąd
  if (!sawDone && !sawError) {
    onEvent({ type: "error", code: "llm_error", at: now() });
  }
}
