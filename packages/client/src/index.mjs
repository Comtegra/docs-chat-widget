// @ts-check
// Publiczne API paczki: transport strumienia czatu, parser SSE, reducer rozmowy, cytowania [n]
// i sanitizacja linków. Zero zależności; działa w przeglądarce (fetch + ReadableStream) i w Node.
export { createSseParser } from "./sse.mjs";
export { streamDocsChat } from "./transport.mjs";
export {
  initialState,
  initialThreadState,
  isRestorableTurn,
  noticeForErrorCode,
  reduce,
  reduceThread,
  selectors,
  threadSelectors,
  turnDurationMs,
} from "./conversation.mjs";
export {
  CITATION_HREF_PREFIX,
  annotateCitations,
  citationNumberFromHref,
  citedSourceNumbers,
  parseCitations,
  sourceCardId,
} from "./citations.mjs";
export { sanitizeMarkdownHref } from "./safeHref.mjs";
