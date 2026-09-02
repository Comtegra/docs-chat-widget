// Teksty Ask CGC przez mechanizm Docusaurusa (`translate` + i18n/pl/code.json) — E2 commit 1a
// (plan cgc-web/docs/ai-native-ui-plan.md §3.10): wcześniej zaszyty obiekt COPY = drugi mechanizm
// i18n obok code.json. Klucze `docsChat.*`; EN = message inline (source of truth dla ekstraktora
// `npm run write-translations -- --locale pl`), PL w i18n/pl/code.json.
// Ekstraktor wymaga literałów — stąd brak pętli po kluczach i trzy osobne wywołania dla przykładów.
import { translate } from "@docusaurus/Translate";

export function getCopy() {
  return {
    title: translate({ id: "docsChat.title", message: "Ask CGC", description: "Docs chat panel title and launcher label" }),
    subtitle: translate({ id: "docsChat.subtitle", message: "Ask about this page or search the full documentation." }),
    placeholder: translate({ id: "docsChat.placeholder", message: "Ask a question about CGC..." }),
    page: translate({ id: "docsChat.scope.page", message: "This page" }),
    all: translate({ id: "docsChat.scope.all", message: "All docs" }),
    scopeLabel: translate({ id: "docsChat.scope.label", message: "Chat scope" }),
    send: translate({ id: "docsChat.send", message: "Ask" }),
    loading: translate({ id: "docsChat.loading", message: "Searching docs..." }),
    thinking: translate({ id: "docsChat.thinking", message: "Thinking…" }),
    reasoning: translate({ id: "docsChat.reasoning", message: "Reasoning" }),
    sources: translate({ id: "docsChat.sources", message: "Sources" }),
    retryAll: translate({ id: "docsChat.retryAll", message: "Search all docs" }),
    rateLimited: translate({ id: "docsChat.error.rateLimited", message: "Too many requests. Please try again later." }),
    noContextAll: translate({
      id: "docsChat.noContextAll",
      message: "I couldn't find anything about that in the documentation. Try rephrasing the question.",
    }),
    noContext: translate({ id: "docsChat.error.noContext", message: "No relevant answer was found on this page." }),
    genericError: translate({ id: "docsChat.error.generic", message: "The assistant could not answer right now." }),
    timeoutError: translate({ id: "docsChat.error.timeout", message: "The assistant took too long to respond. Please try again." }),
    open: translate({ id: "docsChat.open", message: "Ask CGC" }),
    minimize: translate({ id: "docsChat.minimize", message: "Minimize" }),
    expand: translate({ id: "docsChat.expand", message: "Expand" }),
    restore: translate({ id: "docsChat.restore", message: "Restore" }),
    clear: translate({ id: "docsChat.clear", message: "New chat" }),
    emptyTitle: translate({ id: "docsChat.empty.title", message: "Ask anything about CGC" }),
    emptyHint: translate({ id: "docsChat.empty.hint", message: "Ask about the current page or search the whole documentation." }),
    examples: [
      translate({ id: "docsChat.example.1", message: "How do I create my first compute environment?" }),
      translate({ id: "docsChat.example.2", message: "How do I mount a volume?" }),
      translate({ id: "docsChat.example.3", message: "How do I use the LLM inference API?" }),
    ],
    // --- wzorce AI (E2 commit 2): ślad, akcje, karty, composer
    stop: translate({ id: "docsChat.stop", message: "Stop" }),
    stopped: translate({ id: "docsChat.stopped", message: "Stopped" }),
    stepRetrieve: translate({ id: "docsChat.step.retrieve", message: "Searching the documentation" }),
    stepAnswer: translate({ id: "docsChat.step.answer", message: "Writing the answer" }),
    stepFailed: translate({ id: "docsChat.step.failed", message: "failed" }),
    thoughtFor: translate({ id: "docsChat.thoughtFor", message: "Thought for {seconds} s", description: "{seconds} = duration of the answer" }),
    traceToggle: translate({ id: "docsChat.trace.toggle", message: "Show or hide the assistant's steps" }),
    copyAnswer: translate({ id: "docsChat.action.copy", message: "Copy answer" }),
    copied: translate({ id: "docsChat.action.copied", message: "Copied" }),
    retry: translate({ id: "docsChat.action.retry", message: "Ask again" }),
    thumbsUp: translate({ id: "docsChat.action.thumbsUp", message: "Helpful answer" }),
    thumbsDown: translate({ id: "docsChat.action.thumbsDown", message: "Not helpful" }),
    feedbackThanks: translate({ id: "docsChat.action.feedbackThanks", message: "Thanks for the feedback" }),
    feedbackNotStored: translate({ id: "docsChat.action.feedbackNotStored", message: "Feedback could not be saved" }),
    citation: translate({ id: "docsChat.citation", message: "Source {n}", description: "{n} = source number" }),
    startingProposal: translate({ id: "docsChat.code.startingProposal", message: "starting proposal", description: "Badge on generated cgc commands: verify before running" }),
    kbdSend: translate({ id: "docsChat.kbd.send", message: "Enter – send · Shift+Enter – new line" }),
    modelChip: translate({ id: "docsChat.chip.model", message: "Model" }),
    elapsed: translate({ id: "docsChat.elapsed", message: "{seconds} s", description: "Live elapsed timer while the assistant works" }),
    traceDone: translate({ id: "docsChat.trace.done", message: "Steps", description: "Collapsed trace header when the duration is unknown" }),
    statusReady: translate({ id: "docsChat.status.ready", message: "Answer ready", description: "Screen-reader status when streaming ends" }),
    pageUnavailable: translate({ id: "docsChat.scope.pageUnavailable", message: "Available on documentation pages", description: "Tooltip on the disabled 'This page' scope outside docs pages" }),
    shortcutHintCtrl: translate({ id: "docsChat.shortcut.ctrl", message: "Open Ask CGC (Ctrl+/)", description: "Tooltip of the navbar button on Windows/Linux; keep the shortcut" }),
    shortcutHintMeta: translate({ id: "docsChat.shortcut.meta", message: "Open Ask CGC (⌘+/)", description: "Tooltip of the navbar button on macOS; keep the shortcut" }),
    selectionAsk: translate({ id: "docsChat.selection.ask", message: "Ask CGC about this" }),
    selectionToolbar: translate({ id: "docsChat.selection.toolbar", message: "Selected text", description: "Accessible name of the floating bar over a text selection" }),
    selectionPrompt: translate({
      id: "docsChat.selection.prompt",
      message: 'Explain this fragment of the documentation: "{text}"',
      description: "{text} = selected text; keep the quotes of your language",
    }),
    statusWorking: translate({ id: "docsChat.status.working", message: "The assistant is working", description: "Screen-reader status while streaming" }),
  };
}

/**
 * Liczba mnoga dla liczników („5 fragmentów"): translate() nie ma pluralów — usePluralForm
 * z theme-common wybiera formę po locale (pl: one|few|many, en: one|other).
 * Użycie: const { selectMessage } = usePluralForm(); selectMessage(count, translate({ id, message: "1 fragment|{count} fragments" })).replace("{count}", String(count))
 */
export const PLURAL_IDS = {
  fragments: () =>
    translate({
      id: "docsChat.plural.fragments",
      message: "1 fragment|{count} fragments",
      description: "Pipe-separated plural forms (pl: one|few|many)",
    }),
};
