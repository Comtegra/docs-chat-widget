// @ts-check
// KONTRAKT — identyczny w obu repo (kopia: backend docs-chat (safeHref.mjs)).
// Bezpieczne cele linków w markdownie modelu i w kartach źródeł: tylko `/…`, `#…`, http(s) i
// mailto — wszystko inne renderujemy jako tekst. `//host` i `/\host` (protocol-relative —
// przeglądarka rozwiązuje na obcy origin) NIE są ścieżkami względnymi.
/** @param {unknown} href */
export function sanitizeMarkdownHref(href) {
  // parser URL przeglądarki wycina tabulatory/nowe linie (`/\t/evil` → `//evil`) — usuwamy je PRZED testami
  const trimmedHref = String(href || "").replace(/[\t\n\r]/g, "").trim();
  if (/^[/\\]{2}/.test(trimmedHref)) {
    return "";
  }
  if (
    trimmedHref.startsWith("/") ||
    trimmedHref.startsWith("#") ||
    /^https?:\/\//i.test(trimmedHref) ||
    /^mailto:/i.test(trimmedHref)
  ) {
    return trimmedHref;
  }
  return "";
}
