// @ts-check
// Preferencje panelu Ask CGC odtwarzane z migawki sessionStorage (useDocsChat) — migawka jest
// NIEZAUFANA: nieznana wartość wraca do domyślnej, żeby nie trafiła do `html[data-docs-chat]`
// ani do ciała żądania. Tryby zna też skrypt z headTags (docusaurus.config.js) — wpisany tam
// literalnie, bo skrypt jest tekstem; test pilnuje zgodności.
export const PANEL_MODES = /** @type {const} */ (["collapsed", "expanded", "fullscreen"]);
export const SCOPES = /** @type {const} */ (["page", "all"]);

/** @typedef {typeof PANEL_MODES[number]} PanelMode */
/** @typedef {typeof SCOPES[number]} Scope */

/**
 * @param {unknown} value
 * @returns {PanelMode}
 */
export function normalizePanelMode(value) {
  return PANEL_MODES.includes(/** @type {PanelMode} */ (value)) ? /** @type {PanelMode} */ (value) : "collapsed";
}

/**
 * @param {unknown} value
 * @returns {Scope}
 */
export function normalizeScope(value) {
  return SCOPES.includes(/** @type {Scope} */ (value)) ? /** @type {Scope} */ (value) : "all";
}
