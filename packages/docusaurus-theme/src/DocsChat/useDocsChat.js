// Hook Ask CGC — orkiestracja stanu (E2; plan cgc-web/docs/ai-native-ui-plan.md §3.2):
// wszystko, co nie jest renderowaniem, siedzi tutaj; komponenty dostają dane przez propsy.
// Stan wątku żyje w czystym reducerze @comtegra/docs-chat-client (conversation) (kontrakt współdzielony z cgc-web),
// transport (POST → SSE v2 → zdarzenia) w czystym @comtegra/docs-chat-client (transport); hook dokłada jeden
// AbortController na żądanie (Stop / timeout nieaktywności 30 s zerowany każdym chunkiem)
// i bramkę „bieżące żądanie" (spóźnione kontynuacje po Stop nic nie wstrzykną).
// `ask` ma STABILNĄ tożsamość (prompt/scope przez refy) — handlery dla React.memo w widoku.
//
// Persystencja: od 1b panel żyje przez całą nawigację (wrap Layout), więc wystarczy
// sessionStorage (przeżycie przeładowania i remontu na /search); modułowa migawka z czasów
// montażu per strona została usunięta. Utrwalamy tylko zakończone tury i bez `reasoning`.
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import useIsBrowser from "@docusaurus/useIsBrowser";

import { streamDocsChat } from "@comtegra/docs-chat-client";
import { initialThreadState, reduceThread, threadSelectors } from "@comtegra/docs-chat-client";
import { normalizePanelMode, normalizeScope } from "./lib/preferences.mjs";

// v2: kształt tur z reducera (poprzedni klucz "cgc-docs-chat" trzymał płaskie wiadomości —
// migawki sprzed wdrożenia są ignorowane; sessionStorage żyje tylko w karcie)
export const STORAGE_KEY = "cgc-docs-chat:v2";
const LEGACY_STORAGE_KEY = "cgc-docs-chat";
export const REQUEST_TIMEOUT_MS = 30000;

function loadStoredChatState() {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    window.sessionStorage.removeItem(LEGACY_STORAGE_KEY);
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function writePersistedChatState(snapshot) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch (error) {
    // storage niedostępny / pełny — stan żyje w React do końca sesji SPA
  }
}

function clearPersistedChatState() {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    // nic do zrobienia — następny zapis nadpisze
  }
}

/**
 * @param {{ apiUrl: string, feedbackUrl?: string, locale: string, page: { permalink: string } }} options
 */
export default function useDocsChat({ apiUrl, feedbackUrl, locale, page }) {
  const [thread, dispatch] = useReducer(reduceThread, initialThreadState);
  // SSR i pierwszy render klienta zawsze z domyślnymi wartościami (brak niezgodności hydratacji);
  // odtworzenie z sessionStorage w efekcie po montażu
  const [prompt, setPrompt] = useState("");
  const [scope, setScope] = useState("all");
  // tryb panelu synchronicznie z migawki przy remoncie po stronie klienta (docs ↔ /search):
  // useIsBrowser jest false podczas hydratacji (zgodność z SSR), true przy późniejszych montażach
  const isBrowser = useIsBrowser();
  const [panelMode, setPanelMode] = useState(() => (isBrowser ? normalizePanelMode(loadStoredChatState()?.panelMode) : "collapsed"));
  const controllerRef = useRef(null);
  const timeoutRef = useRef(null);
  const restoredRef = useRef(false);
  // po odtworzeniu z sessionStorage — dopiero wtedy wolno nadpisywać migawkę
  const [hydrated, setHydrated] = useState(false);
  // bieżące wartości dla stabilnego `ask` (bez zależności od prompt/scope)
  const promptRef = useRef(prompt);
  promptRef.current = prompt;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const panelModeRef = useRef(panelMode);
  panelModeRef.current = panelMode;
  const threadRef = useRef(thread);
  threadRef.current = thread;

  const loading = threadSelectors.loading(thread);

  const clearTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // odtworzenie z sessionStorage (raz, po montażu — przeładowanie strony lub remont na /search)
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const stored = loadStoredChatState();
    if (stored) {
      if (stored.panelMode) setPanelMode(normalizePanelMode(stored.panelMode));
      if (stored.scope) setScope(normalizeScope(stored.scope));
      if (typeof stored.prompt === "string") setPrompt(stored.prompt);
      if (Array.isArray(stored.turns) && stored.turns.length > 0) {
        dispatch({ type: "restore", turns: stored.turns }); // reducer waliduje kształt (isRestorableTurn)
      }
    }
    // ZAWSZE — także bez migawki (świeża sesja musi zacząć zapisywać; runda weryfikacyjna E2)
    setHydrated(true);
  }, []);

  // panel/zakres/szkic zmieniają się rzadko — utrwalamy od razu (panel przeżywa nawigację
  // także w trakcie streamu); wątek tylko po zakończeniu tury (nie serializujemy per token).
  // Nigdy przed odtworzeniem (domyślny stan nadpisałby migawkę).
  useEffect(() => {
    if (!hydrated) return;
    writePersistedChatState({ panelMode, scope, prompt, turns: threadSelectors.persistable(thread) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, panelMode, scope, prompt]);
  useEffect(() => {
    if (!hydrated || loading) return;
    writePersistedChatState({ panelMode, scope, prompt, turns: threadSelectors.persistable(thread) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, thread, loading]);

  // odmontowanie (np. pełna nawigacja przez link karty): przerwij żądanie i utrwal turę w toku
  // jako zatrzymaną — pytanie nie znika z historii
  useEffect(
    () => () => {
      clearTimer();
      controllerRef.current?.abort();
      const current = threadRef.current;
      if (threadSelectors.loading(current)) {
        const stopped = reduceThread(current, { type: "abort", reason: "stopped", at: Date.now() });
        // bieżące wartości przez refy — domknięcie efektu z [] trzymałoby stan z pierwszego renderu
        writePersistedChatState({
          panelMode: panelModeRef.current,
          scope: scopeRef.current,
          prompt: promptRef.current,
          turns: threadSelectors.persistable(stopped),
        });
      }
    },
    []
  );

  const stop = useCallback(() => {
    if (!controllerRef.current) return;
    controllerRef.current.abort();
    controllerRef.current = null;
    clearTimer();
    dispatch({ type: "abort", reason: "stopped", at: Date.now() });
  }, []);

  /**
   * @param {"page"|"all"} [nextScope]     domyślnie bieżący zakres
   * @param {string} [promptOverride]      domyślnie szkic z composera (i tylko wtedy jest czyszczony)
   */
  const ask = useCallback(
    async (nextScope, promptOverride) => {
      const fromComposer = promptOverride === undefined;
      const trimmedPrompt = String(fromComposer ? promptRef.current : promptOverride ?? "").trim();
      const targetScope = nextScope ?? scopeRef.current;
      if (!trimmedPrompt || controllerRef.current) {
        return;
      }
      // zakres żądania ≠ preferencja: `ask` nie zapisuje `scope` (poza docs pytanie idzie z „all",
      // a preferencja „ta strona" ma przetrwać) — zmienia ją tylko użytkownik (ScopeSwitch, retry-all)
      if (fromComposer) setPrompt("");

      const controller = new AbortController();
      controllerRef.current = controller;
      const { signal } = controller;

      // zdarzenia TEGO pytania przez `emit`: po Stop/timeout spóźnione kontynuacje nie mogą już
      // nic wstrzyknąć (kontrakt hooka jak w cgc-web useCgcChat)
      const isCurrent = () => controllerRef.current === controller;
      const emit = (event) => {
        if (isCurrent()) dispatch(event);
      };

      // timeout nieaktywności: zerowany przy każdym chunku; upływ → abort + notice "timeout"
      const armTimeout = () => {
        if (!isCurrent()) return;
        clearTimer();
        timeoutRef.current = setTimeout(() => {
          if (controllerRef.current !== controller) return;
          controllerRef.current = null;
          controller.abort();
          dispatch({ type: "abort", reason: "timeout", at: Date.now() });
        }, REQUEST_TIMEOUT_MS);
      };

      const startedAt = Date.now();
      dispatch({ type: "start", id: `turn-${startedAt}`, prompt: trimmedPrompt, scope: targetScope, at: startedAt });
      armTimeout();

      try {
        await streamDocsChat({
          apiUrl,
          body: { prompt: trimmedPrompt, locale, scope: targetScope, page },
          signal,
          onEvent: emit,
          onActivity: armTimeout,
        });
      } catch (error) {
        if (signal.aborted) {
          // Stop / timeout — reducer dostał już `abort`
          return;
        }
        console.error("Docs chat error:", error);
        emit({ type: "error", code: "llm_error", at: Date.now() });
      } finally {
        clearTimer();
        if (controllerRef.current === controller) {
          controllerRef.current = null;
        }
      }
    },
    [apiUrl, locale, page]
  );

  // Feedback (kciuk w górę / w dół) → cgc-web /api/chat/feedback po `traceId` z ramki `done`.
  // Stan per traceId (nie w przypiętym reducerze — to nie stan rozmowy): {value, pending, stored}.
  const [feedbackByTrace, setFeedbackByTrace] = useState({});
  const sendFeedback = useCallback(
    async (traceId, value) => {
      if (!feedbackUrl || !traceId || (value !== 1 && value !== -1)) return;
      setFeedbackByTrace((current) => ({ ...current, [traceId]: { value, pending: true, stored: null } }));
      try {
        const response = await fetch(feedbackUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ traceId, value }),
        });
        const payload = response.ok ? await response.json().catch(() => ({})) : {};
        setFeedbackByTrace((current) => ({
          ...current,
          [traceId]: { value, pending: false, stored: response.ok ? Boolean(payload.stored) : false },
        }));
      } catch (error) {
        console.error("Docs chat feedback error:", error);
        setFeedbackByTrace((current) => ({ ...current, [traceId]: { value, pending: false, stored: false } }));
      }
    },
    [feedbackUrl]
  );

  const clearConversation = useCallback(() => {
    if (controllerRef.current) {
      stop();
    }
    dispatch({ type: "clear" });
    setPrompt("");
    clearPersistedChatState();
  }, [stop]);

  return {
    turns: thread.turns,
    loading,
    prompt,
    setPrompt,
    scope,
    setScope,
    panelMode,
    hydrated,
    setPanelMode,
    ask,
    stop,
    clearConversation,
    feedbackByTrace,
    sendFeedback,
  };
}
