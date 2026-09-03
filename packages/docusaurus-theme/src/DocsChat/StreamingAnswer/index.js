// Odpowiedź asystenta jednej tury — wzorzec BUI „Streaming Text" (plan §7): markdown przez
// react-markdown (jak dotąd), karetka ::after podczas strumienia, cytowania `[n]` jako chipy
// (annotateCitations → link `#docs-chat-source-n` → override `a` → chip do karty źródła tej
// tury), bloki kodu przez @theme/CodeBlock. Niedomknięty fence w strumieniu domyka sam
// micromark (CommonMark: fence bez zamknięcia trwa do końca dokumentu) — bez własnego skanera.
// Akcje po zakończeniu: kopiuj, zapytaj ponownie, kciuki (tylko z traceId).
// React.memo + useDeferredValue: tura zakończona nie rerenderuje się, gdy strumieniuje
// następna; propsy to prymitywy/stabilne obiekty (kontener daje handlery z useCallback).
import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import styles from "./styles.module.css";
import CodeBlock from "./CodeBlock";
import { annotateCitations, citationNumberFromHref, sanitizeMarkdownHref, sourceCardId } from "@comtegra/docs-chat-client";
import { CopyIcon, CheckIcon, RetryIcon, ThumbUpIcon, ThumbDownIcon } from "../icons";

export { sanitizeMarkdownHref };

const MARKDOWN_PLUGINS = [remarkGfm];
const COPIED_RESET_MS = 1500;

/**
 * Overrides react-markdown dla jednej tury (cytowania potrzebują `turnId` i listy źródeł).
 * @param {{ turnId: string, sources: Array<{ title: string }>, copy: any }} ctx
 */
export function buildMarkdownComponents({ turnId, sources, copy, settled = true, externalLinks = "allow" }) {
  const focusCard = (n) => (event) => {
    const card = typeof document !== "undefined" ? document.getElementById(sourceCardId(turnId, n)) : null;
    if (!card) return; // brak karty (np. źródła jeszcze nie przyszły) → zwykła nawigacja hash
    event.preventDefault();
    card.scrollIntoView({ block: "nearest", behavior: "smooth" });
    card.focus({ preventScroll: true });
  };

  return {
    a({ href, children, node, ...props }) {
      const n = citationNumberFromHref(href);
      if (n && sources && n <= sources.length) {
        const title = sources[n - 1]?.title || "";
        return (
          <a
            href={`#${sourceCardId(turnId, n)}`}
            className={styles.cite}
            aria-label={`${copy.citation.replace("{n}", String(n))}${title ? `: ${title}` : ""}`}
            title={title || undefined}
            onClick={focusCard(n)}
          >
            {n}
          </a>
        );
      }

      const safeHref = sanitizeMarkdownHref(href);
      if (!safeHref) {
        return <span {...props}>{children}</span>;
      }
      const isExternal = /^https?:\/\//i.test(safeHref) || /^mailto:/i.test(safeHref);
      if (isExternal && externalLinks === "text") {
        // polityka "text": link spoza strony jako tekst z widocznym celem — treść indeksu (indirect
        // prompt injection) nie może podsunąć klikalnego phishingu; użytkownik widzi dokąd prowadził
        let target = safeHref;
        try {
          target = /^mailto:/i.test(safeHref) ? safeHref : new URL(safeHref).host;
        } catch {
          // zostaje pełny href
        }
        return (
          <span {...props}>
            {children} <span aria-hidden="true">({target})</span>
          </span>
        );
      }
      return (
        <a href={safeHref} target={isExternal ? "_blank" : undefined} rel={isExternal ? "noreferrer" : undefined} {...props}>
          {children}
        </a>
      );
    },
    pre({ children }) {
      return <CodeBlock proposalLabel={copy.startingProposal} settled={settled}>{children}</CodeBlock>;
    },
    // obrazki z odpowiedzi modelu: tylko alt jako tekst (żaden zdalny host nie dostaje żądania)
    img({ alt }) {
      return alt ? <span>{alt}</span> : null;
    },
    table({ children }) {
      return (
        <div className={styles.tableScroll}>
          <table>{children}</table>
        </div>
      );
    },
  };
}

/**
 * @param {{ content: string, streaming?: boolean, components: any, turnId: string }} props
 */
export function MarkdownAnswer({ content, streaming = false, components, turnId }) {
  // przypisy GFM: unikalne id per tura (domyślne `user-content-fn-1` powtarzałoby się w wątku)
  const remarkRehypeOptions = useMemo(() => ({ clobberPrefix: `${turnId}-` }), [turnId]);
  if (!content || !content.trim()) {
    return null;
  }
  return (
    <div className={`${styles.answer} ${streaming ? styles.streaming : ""}`}>
      <Markdown remarkPlugins={MARKDOWN_PLUGINS} remarkRehypeOptions={remarkRehypeOptions} components={components} urlTransform={sanitizeMarkdownHref}>
        {content}
      </Markdown>
    </div>
  );
}

// notice z reducera (kontrakt §4.2) → tekst dla użytkownika (no_context zależy od zakresu)
export function errorMessageFor(copy, notice, scope = "all") {
  if (!notice) return null;
  if (notice === "rate_limited") return copy.rateLimited;
  if (notice === "no_context") return scope === "page" ? copy.noContext : copy.noContextAll;
  if (notice === "timeout") return copy.timeoutError;
  // kontrakt: unsafe/pricing kończą turę statusem done (to nie błędy) — treść z backendu
  // renderuje się normalnie, bez czerwonej ramki role=alert
  if (notice === "unsafe" || notice === "pricing") return null;
  return copy.genericError;
}

/**
 * @param {{
 *   turnId: string,
 *   turn: import("@comtegra/docs-chat-client/src/conversation.mjs").ConversationState,
 *   prompt: string,
 *   scope: "page"|"all",
 *   isLast: boolean,
 *   loading: boolean,
 *   copy: any,
 *   feedback: { value: 1|-1, pending: boolean, stored: boolean|null } | undefined,
 *   onFeedback: (traceId: string, value: 1|-1) => void,
 *   onRetry: (scope: "page"|"all", prompt: string) => void,
 *   externalLinks?: "allow"|"text",
 * }} props
 */
function StreamingAnswer({ turnId, turn, prompt, scope, isLast, loading, copy, feedback, onFeedback, onRetry, externalLinks = "allow" }) {
  const errorMessage = errorMessageFor(copy, turn.notice, scope);
  const hasReasoning = Boolean(turn.reasoning && turn.reasoning.trim());
  const isRunning = turn.status === "running";
  // źródła/kroki przyszły, ale ani reasoning, ani treść jeszcze nie — czekamy na pierwszy token
  const isAwaiting = isRunning && isLast && !hasReasoning && !turn.answer && !errorMessage;
  const sources = turn.sources || [];

  // `settled` (tura zakończona) → CodeBlock montuje blok motywu na nowo, żeby jego przycisk zawijania
  // zmierzył pełną szerokość kodu (motyw mierzy tylko przy montażu i resize okna)
  const components = useMemo(
    () => buildMarkdownComponents({ turnId, sources, copy, settled: !isRunning, externalLinks }),
    [turnId, sources, copy, isRunning, externalLinks]
  );
  // useDeferredValue: przy szybkim strumieniu React może pominąć pośrednie renderowania markdownu
  const answer = useDeferredValue(turn.answer);
  const rendered = useMemo(() => annotateCitations(answer, sources.length), [answer, sources.length]);

  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef(null);
  useEffect(() => () => clearTimeout(copiedTimer.current), []);
  const copyAnswer = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(turn.answer);
      setCopied(true);
      clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);
    } catch (error) {
      // brak uprawnień / niebezpieczny kontekst — bez potwierdzenia, bez wyjątku w UI
    }
  }, [turn.answer]);

  const finished = !isRunning && turn.status !== "idle";
  const showActions = finished && (Boolean(turn.answer) || Boolean(errorMessage));
  const canFeedback = Boolean(turn.traceId) && Boolean(turn.answer);
  const feedbackNote = feedback && !feedback.pending
    ? feedback.stored ? copy.feedbackThanks : feedback.stored === false ? copy.feedbackNotStored : null
    : null;

  return (
    <>
      {isAwaiting && (
        <span className={styles.dots} aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      )}
      {answer && <MarkdownAnswer content={rendered} streaming={isRunning && isLast} components={components} turnId={turnId} />}
      {turn.status === "stopped" && !turn.notice && <span className={styles.stoppedTag}>{copy.stopped}</span>}
      {errorMessage && (
        <div className={styles.error} role="alert">
          <p>{errorMessage}</p>
          {turn.notice === "no_context" && scope === "page" && (
            <button type="button" onClick={() => onRetry("all", prompt)}>
              {copy.retryAll}
            </button>
          )}
        </div>
      )}
      {showActions && (
        <div className={styles.actions}>
          {turn.answer && (
            <button type="button" className={styles.actionButton} onClick={copyAnswer} aria-label={copied ? copy.copied : copy.copyAnswer} title={copy.copyAnswer}>
              {copied ? <CheckIcon /> : <CopyIcon />}
              <span>{copied ? copy.copied : copy.copyAnswer}</span>
            </button>
          )}
          <button
            type="button"
            className={styles.actionButton}
            onClick={() => { if (!loading) onRetry(scope, prompt); }}
            aria-disabled={loading || undefined}
            aria-label={copy.retry}
            title={copy.retry}
          >
            <RetryIcon />
            <span>{copy.retry}</span>
          </button>
          {canFeedback && (
            <>
              <span className={styles.actionsSpacer} />
              <button
                type="button"
                className={styles.actionButton}
                aria-label={copy.thumbsUp}
                title={copy.thumbsUp}
                aria-pressed={feedback?.value === 1}
                aria-disabled={Boolean(feedback?.pending) || undefined}
                onClick={() => { if (!feedback?.pending) onFeedback(/** @type {string} */ (turn.traceId), 1); }}
              >
                <ThumbUpIcon />
              </button>
              <button
                type="button"
                className={styles.actionButton}
                aria-label={copy.thumbsDown}
                title={copy.thumbsDown}
                aria-pressed={feedback?.value === -1}
                aria-disabled={Boolean(feedback?.pending) || undefined}
                onClick={() => { if (!feedback?.pending) onFeedback(/** @type {string} */ (turn.traceId), -1); }}
              >
                <ThumbDownIcon />
              </button>
              {feedbackNote && (
                <span className={styles.feedbackNote} role="status">
                  {feedbackNote}
                </span>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}

export default React.memo(StreamingAnswer);
