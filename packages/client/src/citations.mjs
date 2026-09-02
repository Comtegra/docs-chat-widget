// @ts-check
// Cytowania `[n]` w odpowiedzi modelu (schemas/): numer = indeks źródła + 1. Parser dzieli
// tekst na segmenty tekstowe i cytowania — TYLKO poza inline code i fence'ami, i tylko
// 1 ≤ n ≤ sourceCount (inne `[7]`, `arr[0]`, `[1]: http…` zostają tekstem). Cytowania są
// ozdobą, nie nośnikiem: gdy model nie cytuje, odpowiedź renderuje się bez zmian.

/** @typedef {{ type: "text", value: string } | { type: "cite", n: number }} CitationSegment */

const CITE = /\[(\d{1,3})\]/g;

/**
 * Zwraca maskę pozycji, które są wewnątrz kodu (inline `…` lub fence'a) — cytowania tam nie
 * są parsowane. Fence: dowolne wcięcie (lista `10.`, zagnieżdżony punkt) i prefiks cytatu `> `
 * (CommonMark dopuszcza; LLM-y tak piszą) — nie tylko 0–3 spacje.
 * @param {string} text
 */
function codeMask(text) {
  const mask = new Uint8Array(text.length);
  let i = 0;
  /** @type {{ char: string, len: number } | null} */
  let inFence = null;
  const lines = text.split("\n");
  for (const line of lines) {
    const start = i;
    const end = i + line.length;
    const fenceMatch = /^[ \t]*(?:>[ \t]*)*(`{3,}|~{3,})/.exec(line);
    if (inFence) {
      mask.fill(1, start, end + 1);
      if (fenceMatch && fenceMatch[1][0] === inFence.char && fenceMatch[1].length >= inFence.len) {
        inFence = null;
      }
    } else if (fenceMatch) {
      inFence = { char: fenceMatch[1][0], len: fenceMatch[1].length };
      mask.fill(1, start, end + 1);
    } else {
      // inline code spans
      const spanRe = /`+[^`]*`+/g;
      let m;
      while ((m = spanRe.exec(line))) {
        mask.fill(1, start + m.index, start + m.index + m[0].length);
      }
    }
    i = end + 1;
  }
  return mask;
}

/**
 * Czy `[n]` na pozycji `index` stoi w kontekście, w którym zamiana na link zepsułaby markdown:
 *  - referencja `[tekst][1]` (poprzedza `]`) albo link/definicja `[1](url)` / `[1][id]` / `[1]: url`
 *  - wewnątrz tekstu linku/altu obrazka: nieparzysty `[` wcześniej w tej linii (`[Guide [1]](/x)`)
 *  - wewnątrz celu linku `](…)` albo w URL-u pisanym wprost (token z `://` lub `www.`)
 * @param {string} text
 * @param {number} index      początek dopasowania `[n]`
 * @param {number} matchEnd   koniec dopasowania
 */
function isUnsafeCitationContext(text, index, matchEnd) {
  const next = text[matchEnd];
  if (next === ":" || next === "(") return true;
  // `[1][2]` (sąsiednie cytowania) jest OK; `[1][ref]` / `[tekst][1]` (referencje) — nie
  if (next === "[" && !/^\[\d{1,3}\]/.test(text.slice(matchEnd))) return true;
  const lineStart = text.lastIndexOf("\n", index - 1) + 1;
  const before = text.slice(lineStart, index);
  if (before.endsWith("]") && !/\[\d{1,3}\]$/.test(before)) return true;
  // nieparzyste `[` przed dopasowaniem = jesteśmy w tekście linku/alt
  let depth = 0;
  for (const ch of before) {
    if (ch === "[") depth += 1;
    else if (ch === "]" && depth > 0) depth -= 1;
  }
  if (depth > 0) return true;
  // w celu linku: ostatnie `](` bez domykającego `)`
  const dest = before.lastIndexOf("](");
  if (dest !== -1 && before.indexOf(")", dest) === -1) return true;
  // w URL-u pisanym wprost
  const tokenStart = before.search(/\S+$/);
  const token = tokenStart === -1 ? "" : before.slice(tokenStart);
  if (/:\/\/|^www\./i.test(token)) return true;
  return false;
}

/**
 * @param {string} text
 * @param {number} sourceCount
 * @returns {CitationSegment[]}
 */
export function parseCitations(text, sourceCount) {
  if (typeof text !== "string" || !text) {
    return [];
  }
  const max = Number.isInteger(sourceCount) ? sourceCount : 0;
  if (max <= 0 || !text.includes("[")) {
    return [{ type: "text", value: text }];
  }
  const mask = codeMask(text);
  /** @type {CitationSegment[]} */
  const out = [];
  let last = 0;
  CITE.lastIndex = 0;
  let m;
  while ((m = CITE.exec(text))) {
    const n = Number(m[1]);
    const matchEnd = m.index + m[0].length;
    if (mask[m.index] || n < 1 || n > max || isUnsafeCitationContext(text, m.index, matchEnd)) {
      continue;
    }
    if (m.index > last) {
      out.push({ type: "text", value: text.slice(last, m.index) });
    }
    out.push({ type: "cite", n });
    last = matchEnd;
  }
  if (last < text.length) {
    out.push({ type: "text", value: text.slice(last) });
  }
  return out;
}

/**
 * Numery źródeł zacytowanych w tekście (unikalne, w kolejności pierwszego wystąpienia).
 * @param {string} text
 * @param {number} sourceCount
 */
export function citedSourceNumbers(text, sourceCount) {
  const seen = new Set();
  for (const seg of parseCitations(text, sourceCount)) {
    if (seg.type === "cite") seen.add(seg.n);
  }
  return [...seen];
}

export const CITATION_HREF_PREFIX = "#docs-chat-source-";

/**
 * Zamienia poprawne cytowania `[n]` (poza kodem, w zakresie) na linki markdown
 * `[n](#docs-chat-source-n)`, żeby ISTNIEJĄCY pipeline react-markdown (override `a`,
 * sanitizeMarkdownHref przepuszcza `#`) wyrenderował je jako chipy — bez nowego parsera
 * w drzewie renderowania. Numer w nawiasie zostaje tekstem linku.
 * @param {string} text
 * @param {number} sourceCount
 */
export function annotateCitations(text, sourceCount) {
  return parseCitations(text, sourceCount)
    .map((seg) => (seg.type === "cite" ? `[${seg.n}](${CITATION_HREF_PREFIX}${seg.n})` : seg.value))
    .join("");
}

/**
 * Numer źródła z href linku cytowania albo null.
 * @param {unknown} href
 */
export function citationNumberFromHref(href) {
  if (typeof href !== "string" || !href.startsWith(CITATION_HREF_PREFIX)) return null;
  const n = Number(href.slice(CITATION_HREF_PREFIX.length));
  return Number.isInteger(n) && n >= 1 ? n : null;
}

/**
 * id elementu karty źródła `n` tury `turnId` — ContextCards nadaje, chip cytowania celuje.
 * @param {string} turnId
 * @param {number} n
 */
export function sourceCardId(turnId, n) {
  return `docs-chat-source-${turnId}-${n}`;
}
