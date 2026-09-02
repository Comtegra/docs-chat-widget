// @ts-check
// Skrót otwierający Ask CGC: Ctrl+/ (⌘+/ na macOS). Po `key` (znak z aktywnego układu), NIE po
// `code === "Slash"` — ten fizyczny klawisz to na QWERTZ/ES/IT/PT „-", więc porywałby Ctrl+- (zoom
// out). Na DE/FR „/" wymaga Shift (Shift+7) — dlatego shiftKey jest dozwolony. Tylko „/": „?"
// (Shift+/ na US) to na macOS ⌘+? = menu Pomoc systemu — nie porywamy. Bez Alt (AltGr = Ctrl+Alt
// na Windows — nie porywamy znaków wpisywanych z AltGr).
/**
 * @param {{ ctrlKey: boolean, metaKey: boolean, altKey: boolean, key: string }} event
 */
export function isOpenShortcut(event) {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return false;
  return event.key === "/";
}
