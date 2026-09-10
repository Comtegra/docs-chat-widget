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

/**
 * Platforma z `navigator`: Chromium podaje `userAgentData.platform` („macOS", „Windows", „Linux",
 * „Android"), pozostałe przeglądarki tylko `navigator.platform` („MacIntel", „Win32", „iPhone").
 * @param {{ userAgentData?: { platform?: string }, platform?: string } | null | undefined} [nav]
 */
export function detectPlatform(nav = typeof navigator !== "undefined" ? navigator : undefined) {
  if (!nav) return "";
  return nav.userAgentData?.platform || nav.platform || "";
}

/**
 * Apple = skrót z ⌘. Bez względu na wielkość liter: Chromium daje „macOS", Safari/Firefox „MacIntel",
 * iPad na iPadOS 13+ też „MacIntel". Case-sensitive /Mac/ nie łapało „macOS" i na macOS w Chrome/Edge/Brave
 * podpowiedź pokazywała Ctrl+/ (zgłoszenie e-Instytucji).
 * @param {string | undefined} platform
 */
export function isApplePlatform(platform) {
  return /mac|iphone|ipad/i.test(platform || "");
}
