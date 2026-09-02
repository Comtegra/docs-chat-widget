// @ts-check
// Język bloku kodu z klasy react-markdown (`language-x`) → identyfikator dla CodeBlock motywu.
// Aliasy shellowe → bash (jedyny dodatkowy język Prism zarejestrowany w docusaurus.config.js:
// prism.additionalLanguages). Polecenia `cgc …` = „propozycja startowa" (etykieta w UI).

const SHELL_ALIASES = new Set(["sh", "shell", "zsh", "console", "shell-session"]);
const CGC_COMMAND = /(^|\n)[ \t]*(?:\$[ \t]+)?cgc(?:\s|$)/;

/**
 * @param {unknown} className  np. "language-bash"; brak → "text"
 */
export function languageFromClassName(className) {
  const match = /language-([\w-]+)/.exec(String(className || ""));
  if (!match) return "text";
  const lang = match[1].toLowerCase();
  return SHELL_ALIASES.has(lang) ? "bash" : lang;
}

/**
 * @param {string} code
 * @param {string} language
 */
export function isCgcProposal(code, language) {
  // gołe ``` (częste u LLM) → "text": polecenie cgc nadal dostaje etykietę
  return (language === "bash" || language === "text") && CGC_COMMAND.test(String(code));
}
