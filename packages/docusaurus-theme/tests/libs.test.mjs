// Testy libek UI theme'u (format, język bloków kodu, zaznaczenie, skrót, preferencje) —
// przeniesione z repo docs CGC.
import assert from "node:assert/strict";
import test from "node:test";

import { formatSeconds } from "../src/DocsChat/lib/format.mjs";
import { detectPlatform, isApplePlatform, isOpenShortcut } from "../src/DocsChat/lib/shortcut.mjs";
import { PANEL_MODES, SCOPES, normalizePanelMode, normalizeScope } from "../src/DocsChat/lib/preferences.mjs";
import {
  SELECTION_MAX_CHARS,
  SELECTION_MIN_CHARS,
  buildSelectionPrompt,
  isAskableAncestry,
  normalizeSelectionText,
} from "../src/DocsChat/lib/selection.mjs";
import { isCgcProposal, isCommandProposal, languageFromClassName } from "../src/DocsChat/lib/codeLanguage.mjs";


test("formatSeconds: one decimal below 10 s, whole seconds after; locale decimal separator", () => {
  assert.equal(formatSeconds(1234, "en"), "1.2");
  assert.equal(formatSeconds(1234, "pl"), "1,2");
  assert.equal(formatSeconds(12345, "pl"), "12");
  assert.equal(formatSeconds(0), "0.0");
  assert.equal(formatSeconds(-5), "0.0");
  assert.equal(formatSeconds(NaN), "0.0");
});

test("languageFromClassName: shell aliases → bash, unknown → text; isCgcProposal for bash/text with a cgc command", () => {
  assert.equal(languageFromClassName("language-bash"), "bash");
  assert.equal(languageFromClassName("language-sh"), "bash");
  assert.equal(languageFromClassName("language-console"), "bash");
  assert.equal(languageFromClassName("language-python"), "python");
  assert.equal(languageFromClassName(undefined), "text");
  assert.equal(languageFromClassName("hljs"), "text");
  assert.equal(isCgcProposal("cgc compute create nginx", "bash"), true);
  assert.equal(isCgcProposal("$ cgc volume list", "bash"), true);
  assert.equal(isCgcProposal("kubectl get pods\ncgc status", "bash"), true);
  assert.equal(isCgcProposal("cgc compute create", "python"), false);
  assert.equal(isCgcProposal("cgc compute create", "text"), true); // gołe ``` bez języka
  assert.equal(isCgcProposal("mycgc run", "bash"), false);
  assert.equal(isCgcProposal("echo cgcx", "bash"), false);
  assert.equal(isCommandProposal("Remove-Item x", "powershell"), true);
  assert.equal(isCommandProposal("rm -rf ./tmp", "bash"), true);
  assert.equal(isCommandProposal("print(1)", "python"), false);
  assert.equal(isCommandProposal("cgc status", "text"), true);
});

// --- selection (E5) -----------------------------------------------------------------------------

test("normalizeSelectionText: collapses whitespace, rejects < 8 chars, caps at 500 on a word boundary with an ellipsis", () => {
  assert.equal(SELECTION_MIN_CHARS, 8);
  assert.equal(SELECTION_MAX_CHARS, 500);
  assert.equal(normalizeSelectionText("  cgc   compute\n\tcreate  "), "cgc compute create");
  assert.equal(normalizeSelectionText("short"), "");
  assert.equal(normalizeSelectionText("1234567"), ""); // 7 < 8
  assert.equal(normalizeSelectionText("12345678"), "12345678"); // dokładnie 8
  assert.equal(normalizeSelectionText("\u200BNagłówek sekcji\u200B\u2060"), "Nagłówek sekcji"); // hash-link Docusaurusa, word-joiner
  assert.equal(normalizeSelectionText(null), "");
  const noSpaces = "x".repeat(600);
  assert.equal(normalizeSelectionText(noSpaces), `${"x".repeat(500)}…`); // brak spacji → twarde cięcie
  const long = Array.from({ length: 120 }, (_, i) => `word${i}`).join(" ");
  const out = normalizeSelectionText(long);
  assert.ok(out.length <= SELECTION_MAX_CHARS + 1, String(out.length));
  assert.ok(out.endsWith("…"));
  assert.doesNotMatch(out, /\s…$/);
});

test("buildSelectionPrompt substitutes {text} once (template owns the quotes)", () => {
  assert.equal(buildSelectionPrompt('Explain: "{text}"', "cgc volume create"), 'Explain: "cgc volume create"');
  assert.equal(buildSelectionPrompt("Wyjaśnij: „{text}”", "x y z abc"), "Wyjaśnij: „x y z abc”");
  assert.equal(buildSelectionPrompt('E: "{text}"', "echo $& $' $$ done"), 'E: "echo $& $\' $$ done"'); // wzorce $ nie są interpretowane
});

test("isAskableAncestry: inside article, but not in nav/footer/pre/code/controls/panel/toc/breadcrumbs", () => {
  const ok = [{ tag: "P" }, { tag: "DIV", className: "theme-doc-markdown markdown" }, { tag: "ARTICLE" }, { tag: "MAIN" }];
  assert.equal(isAskableAncestry(ok), true);
  assert.equal(isAskableAncestry([{ tag: "P" }, { tag: "MAIN" }]), false); // poza article
  assert.equal(isAskableAncestry([{ tag: "SPAN" }, { tag: "CODE" }, { tag: "PRE" }, { tag: "ARTICLE" }]), false);
  assert.equal(isAskableAncestry([{ tag: "CODE" }, { tag: "P" }, { tag: "ARTICLE" }]), true); // inline code (`cgc …`) jest pytalne
  assert.equal(isAskableAncestry([{ tag: "A", className: "navbar__link" }, { tag: "ARTICLE" }]), true); // klasa z prefiksem ≠ .navbar
  assert.equal(isAskableAncestry([{ tag: "DIV", className: "theme-doc-toc-mobile" }, { tag: "ARTICLE" }]), false);
  assert.equal(isAskableAncestry([{ tag: "A" }, { tag: "NAV", className: "pagination-nav" }, { tag: "ARTICLE" }]), false);
  assert.equal(isAskableAncestry([{ tag: "DIV", className: "theme-doc-footer" }, { tag: "ARTICLE" }]), false);
  assert.equal(isAskableAncestry([{ tag: "LI" }, { tag: "UL", className: "table-of-contents" }, { tag: "ARTICLE" }]), false);
  assert.equal(isAskableAncestry([{ tag: "P" }, { tag: "SECTION", id: "docs-chat-panel" }, { tag: "ARTICLE" }]), false);
  assert.equal(isAskableAncestry([{ tag: "BUTTON" }, { tag: "ARTICLE" }]), false);
  assert.equal(isAskableAncestry([{ tag: "DIV", id: "docs-chat-selection" }]), false);
  assert.equal(isAskableAncestry([]), false);
});

// --- shortcut (E6) --------------------------------------------------------------------------------

test("isOpenShortcut: Ctrl+/ or ⌘+/ by key (Shift allowed — DE/FR layouts), never with Alt/AltGr", () => {
  const ev = (o) => ({ ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, key: "", code: "", ...o });
  assert.equal(isOpenShortcut(ev({ ctrlKey: true, key: "/" })), true);
  assert.equal(isOpenShortcut(ev({ metaKey: true, key: "/" })), true);
  assert.equal(isOpenShortcut(ev({ ctrlKey: true, shiftKey: true, key: "/", code: "Digit7" })), true); // DE: Shift+7
  assert.equal(isOpenShortcut(ev({ metaKey: true, key: "?", code: "Slash" })), false); // ⌘+? = menu Pomoc macOS
  assert.equal(isOpenShortcut(ev({ key: "/" })), false);
  assert.equal(isOpenShortcut(ev({ ctrlKey: true, altKey: true, key: "/" })), false); // AltGr
  assert.equal(isOpenShortcut(ev({ ctrlKey: true, key: "k" })), false);
  // fizyczny „Slash" to na QWERTZ/ES/IT/PT „-": Ctrl+- (zoom out) NIE może otwierać panelu
  assert.equal(isOpenShortcut(ev({ ctrlKey: true, key: "-", code: "Slash" })), false);
  assert.equal(isOpenShortcut(ev({ metaKey: true, key: "-", code: "Slash" })), false);
});

test("normalizePanelMode: only known modes from the (untrusted) snapshot; anything else collapses", () => {
  assert.deepEqual([...PANEL_MODES], ["collapsed", "expanded", "fullscreen"]);
  for (const mode of PANEL_MODES) assert.equal(normalizePanelMode(mode), mode);
  for (const bad of [undefined, null, "", "open", "EXPANDED", 1, {}, "expanded "]) assert.equal(normalizePanelMode(bad), "collapsed");
  assert.deepEqual([...SCOPES], ["page", "all"]);
  for (const scope of SCOPES) assert.equal(normalizeScope(scope), scope);
  for (const bad of [undefined, null, "", "site", "PAGE", 0, []]) assert.equal(normalizeScope(bad), "all");
});

test("isApplePlatform: macOS z userAgentData (Chromium) i MacIntel/iPhone/iPad z navigator.platform; reszta → Ctrl", () => {
  for (const platform of ["macOS", "MacIntel", "iPhone", "iPad"]) assert.equal(isApplePlatform(platform), true, platform);
  for (const platform of ["Windows", "Win32", "Linux", "Linux x86_64", "Android", "Chrome OS", ""]) {
    assert.equal(isApplePlatform(platform), false, platform);
  }
  assert.equal(isApplePlatform(undefined), false);
});

test("detectPlatform: userAgentData.platform przed navigator.platform; brak navigatora → pusty string", () => {
  assert.equal(detectPlatform({ userAgentData: { platform: "macOS" }, platform: "MacIntel" }), "macOS");
  assert.equal(detectPlatform({ platform: "MacIntel" }), "MacIntel");
  assert.equal(detectPlatform({ userAgentData: {}, platform: "Win32" }), "Win32");
  assert.equal(detectPlatform({}), "");
  assert.equal(detectPlatform(null), ""); // undefined = parametr domyślny (globalny navigator, w Node 21+ istnieje)
});
