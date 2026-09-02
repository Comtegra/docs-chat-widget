// Źródła odpowiedzi jako numerowane karty (wzorzec BUI „Context Cards", plan §7). Numer =
// pozycja w ramce `sources` = numer cytowania `[n]`; id karty = sourceCardId(turnId, n), żeby
// chip cytowania mógł ją wskazać. Snippet z serwera (lib/vdb/snippet.mjs) jest CZYSTYM
// tekstem — renderujemy jako tekst. `url` relatywny (kompat z ramką `sources`); brak `url` →
// karta bez linku (web-info). Trasa pokazana jako `route` (surowa; kontrakt SSE v2).
// Link przez @docusaurus/Link: nawigacja SPA (panel i strumień przeżywają klik w kartę);
// href zawsze przez sanitizeMarkdownHref (dane z serwera, ale ta sama polityka co dla modelu).
import React from "react";
import Link from "@docusaurus/Link";
import styles from "./styles.module.css";
import { sanitizeMarkdownHref, sourceCardId } from "@comtegra/docs-chat-client";

/**
 * @param {{ turnId: string, label: string, sources: Array<{ title: string, route?: string|null, url?: string|null, snippet?: string }> }} props
 */
export default function ContextCards({ turnId, label, sources }) {
  if (!sources || sources.length === 0) {
    return null;
  }

  return (
    <div className={styles.sources}>
      <span className={styles.label}>{label}</span>
      <ol className={styles.list} role="list">
        {sources.map((source, index) => {
          const n = index + 1;
          const body = (
            <>
              <span className={styles.number} aria-hidden="true">
                {n}
              </span>
              <span className={styles.body}>
                <span className={styles.title}>{source.title}</span>
                {source.route && <span className={styles.route}>{source.route}</span>}
                {source.snippet && <p className={styles.snippet}>{source.snippet}</p>}
              </span>
            </>
          );
          const key = `${source.url || source.route || ""}-${source.title}-${n}`;
          const href = sanitizeMarkdownHref(source.url);
          return (
            <li key={key}>
              {href ? (
                <Link id={sourceCardId(turnId, n)} className={styles.card} to={href}>
                  {body}
                </Link>
              ) : (
                <span id={sourceCardId(turnId, n)} className={styles.card} tabIndex={-1}>
                  {body}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
