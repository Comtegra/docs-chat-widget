// @ts-check
// Zaznaczenie → pytanie (E5, plan cgc-web/docs/ai-native-ui-plan.md §10): czysta logika bez DOM.
// Selekcja jest „pytalna", gdy po normalizacji ma 8–500 znaków (krótsze = przypadkowe
// kliknięcia, dłuższe = całe sekcje — model i tak dostaje kontekst z RAG).

export const SELECTION_MIN_CHARS = 8;
export const SELECTION_MAX_CHARS = 500;

/**
 * Normalizuje tekst zaznaczenia: białe znaki → pojedyncze spacje, przycięcie, twardy limit.
 * @param {unknown} text
 * @returns {string} "" gdy za krótkie / nie-string
 */
export function normalizeSelectionText(text) {
  if (typeof text !== "string") return "";
  // zero-width (np. `.hash-link` nagłówków Docusaurusa to U+200B) → poza tekstem
  const collapsed = text.replace(/[\u200B-\u200D\u2060\uFEFF]/g, "").replace(/\s+/g, " ").trim();
  if (collapsed.length < SELECTION_MIN_CHARS) return "";
  if (collapsed.length <= SELECTION_MAX_CHARS) return collapsed;
  const head = collapsed.slice(0, SELECTION_MAX_CHARS);
  const cut = head.lastIndexOf(" ");
  return `${(cut > SELECTION_MAX_CHARS * 0.6 ? head.slice(0, cut) : head).trimEnd()}…`;
}

/**
 * Prompt z szablonu i18n: `{text}` → zaznaczenie w cudzysłowie typograficznym („…" po polsku,
 * "…" po angielsku — szablon decyduje; tu tylko podstawienie).
 * @param {string} template  np. 'Explain this fragment: "{text}"'
 * @param {string} text      znormalizowane zaznaczenie
 */
export function buildSelectionPrompt(template, text) {
  // funkcja zamiast stringa: `$&`, `$'`, `$$` w zaznaczeniu (docs bashowe) nie są wzorcami
  return String(template).replace("{text}", () => text);
}

/**
 * Czy element (po nazwie tagu i klasach przodków) jest treścią dokumentu, o którą można pytać:
 * wewnątrz `article`, poza nawigacją/stopką/blokami kodu (`pre`; inline `code` — np. polecenie
 * `cgc …` — JEST pytalne)/przyciskami i poza panelem Ask CGC. Pola formularzy nie mogą być
 * przodkiem granicy zaznaczenia (Selection API), więc nie ma ich na liście.
 * Czysta funkcja nad łańcuchem przodków (od najbliższego): [{ tag, id?, className? }].
 * @param {Array<{ tag: string, id?: string, className?: string }>} ancestors
 */
export function isAskableAncestry(ancestors) {
  let inArticle = false;
  for (const { tag, id = "", className = "" } of ancestors) {
    const t = tag.toLowerCase();
    if (id === "docs-chat-panel" || id === "docs-chat-selection") return false;
    if (t === "nav" || t === "footer" || t === "pre" || t === "button") return false;
    if (/\btheme-doc-footer\b|\bpagination-nav\b|\btheme-doc-toc\b|\btable-of-contents\b|\bnavbar\b|\btheme-doc-breadcrumbs\b/.test(className)) return false;
    if (t === "article") inArticle = true;
  }
  return inArticle;
}
