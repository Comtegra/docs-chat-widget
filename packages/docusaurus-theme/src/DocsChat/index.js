// Ask CGC — szuflada czatu nad dokumentacją (E6, plan cgc-web/docs/ai-native-ui-plan.md §7b).
// Kompozycja: stan i transport w useDocsChat.js, logika czysta w lib/*.mjs, prezentacja w
// NavbarEntry / PanelHeader / EmptyState / ThinkingTrace / StreamingAnswer / ContextCards /
// PromptBar / SelectionActions. Montowany RAZ przez wrap src/theme/Layout na KAŻDEJ trasie —
// żyje przez całą nawigację; `permalink` aktywnego doca przychodzi propsem (null poza docs → zakres
// wymuszony „Cała dokumentacja"). Wejście: przycisk w navbarze (portal do slotu z konfiguracji) +
// skrót Ctrl+/ + launcher w rogu na mobile.
//
// Dostępność: panel = portal do <body>; w pełnym ekranie reszta strony (#__docusaurus) dostaje
// `inert`; wątek = role="log" + aria-busy podczas strumienia; jeden role="status" („Asystent
// pracuje" / „Odpowiedź gotowa"); Escape zwija i oddaje fokus na przycisk w navbarze/launcher.
// `html[data-docs-chat]` = tryb panelu (custom.css odsuwa treść docs, gdy jest miejsce).
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

import styles from "./styles.module.css";
import { getCopy } from "./i18n";
import useDocsChat from "./useDocsChat";
import usePanelDom from "./usePanelDom";
import ThinkingTrace from "./ThinkingTrace";
import StreamingAnswer from "./StreamingAnswer";
import ContextCards from "./ContextCards";
import PromptBar from "./PromptBar";
import PanelHeader from "./PanelHeader";
import EmptyState from "./EmptyState";
import NavbarEntry, { NAVBAR_BUTTON_ID } from "./NavbarEntry";
import SelectionActions from "./SelectionActions";
import { buildSelectionPrompt } from "./lib/selection.mjs";
import { ChatBubbleIcon } from "./icons";
import { turnDurationMs } from "@comtegra/docs-chat-client";

/**
 * @param {{ permalink: string|null }} props  permalink aktywnego dokumentu (== metadata.permalink); null poza docs
 */
export default function DocsChat({ permalink }) {
  const { siteConfig, i18n } = useDocusaurusContext();
  const locale = (i18n?.currentLocale || "en").toLowerCase();
  // stałe per build (translate() zna locale statycznie) — jedna instancja, żeby React.memo
  // w StreamingAnswer/ThinkingTrace nie dostawał świeżego obiektu co render
  const copy = useMemo(() => getCopy(), []);
  const apiUrl = siteConfig.customFields?.docsChatApiUrl;
  const feedbackUrl = siteConfig.customFields?.docsChatFeedbackUrl;
  const selectionEnabled = siteConfig.customFields?.docsChatSelectionActions !== false;

  // kontrakt żądania (cgc-web lib/docsChat/request.mjs): scope=page wymaga `page.permalink`
  // (lub `page.source` — klient sprzed 1b); tu tylko permalink. Poza docs (null) zakres „ta strona"
  // jest niedostępny — segment aria-disabled, a wybrany wcześniej „page" wraca do „all".
  const pageAvailable = typeof permalink === "string" && permalink.length > 0;
  const page = useMemo(() => ({ permalink: pageAvailable ? permalink : "" }), [pageAvailable, permalink]);

  const chat = useDocsChat({ apiUrl, feedbackUrl, locale, page });
  const {
    turns,
    loading,
    prompt,
    setPrompt,
    scope,
    setScope,
    panelMode,
    setPanelMode,
    hydrated,
    ask,
    stop,
    clearConversation,
    feedbackByTrace,
    sendFeedback,
  } = chat;

  // poza docs zakres „ta strona" jest niedostępny — pochodna, nie nadpisanie preferencji użytkownika
  // (wizyta na /search nie kasuje jego wyboru); pytania idą z zakresem efektywnym
  const effectiveScope = pageAvailable ? scope : "all";

  const launcherRef = useRef(null);
  const chatBodyRef = useRef(null);
  const inputRef = useRef(null);
  const autoScrollRef = useRef(true);
  const turnCountRef = useRef(0);

  useEffect(() => {
    const node = chatBodyRef.current;
    if (!node) return;
    // nowa tura zawsze przewija do dołu; w trakcie streamu podążamy tylko, gdy czytelnik
    // jest już przy dole — nigdy nie odciągamy go od starszego tekstu
    const isNewTurn = turns.length !== turnCountRef.current;
    turnCountRef.current = turns.length;
    if (isNewTurn) {
      autoScrollRef.current = true;
    }
    if (autoScrollRef.current) {
      node.scrollTop = node.scrollHeight;
    }
  }, [turns]);

  function handleChatScroll() {
    const node = chatBodyRef.current;
    if (!node) return;
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    autoScrollRef.current = distanceFromBottom < 80;
  }

  // fokus po otwarciu: launcher znika z DOM, panel jest portalem na końcu <body> — bez tego
  // Tab startuje od początku strony, a Escape na panelu nie działa do pierwszego kliknięcia
  const isPanelOpen = panelMode !== "collapsed";
  useEffect(() => {
    if (!isPanelOpen) return;
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [isPanelOpen]);

  // stabilne handlery dla React.memo(StreamingAnswer): (scope, prompt) / (traceId, value).
  // „Szukaj we wszystkich" zmienia preferencję (jak dotąd); poza docs każde pytanie idzie z „all"
  const retryTurn = useCallback(
    (nextScope, prompt) => {
      // setScope bez porównania z bieżącym (React i tak pomija równą wartość) — handler nie zależy
      // od `scope`, więc nie zmienia tożsamości przy każdym przełączeniu segmentu
      if (pageAvailable) setScope(nextScope);
      ask(pageAvailable ? nextScope : "all", prompt);
    },
    [ask, pageAvailable, setScope]
  );
  const submitFromComposer = useCallback(() => ask(effectiveScope), [ask, effectiveScope]);
  const clearAndFocus = useCallback(() => {
    clearConversation();
    inputRef.current?.focus();
  }, [clearConversation]);
  // E5: zaznaczenie → prompt w composerze (zakres „ta strona"), panel otwarty, fokus; szkic dopisany
  const askAboutSelection = useCallback(
    (text) => {
      const addition = buildSelectionPrompt(copy.selectionPrompt, text);
      setScope("page");
      setPrompt((draft) => (draft.trim() ? `${draft.trimEnd()}\n\n${addition}` : addition));
      setPanelMode((mode) => (mode === "collapsed" ? "expanded" : mode));
      window.requestAnimationFrame(() => inputRef.current?.focus());
    },
    [copy.selectionPrompt, setPrompt, setScope, setPanelMode]
  );

  // otwarcie z navbaru / skrótu / launchera: rozwiń (albo, gdy już otwarty, tylko fokus na composer)
  const openPanel = useCallback(() => {
    setPanelMode((mode) => (mode === "collapsed" ? "expanded" : mode));
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, [setPanelMode]);

  function collapsePanel() {
    setPanelMode("collapsed");
    if (typeof window !== "undefined") {
      // fokus wraca tam, skąd się otwiera: przycisk w navbarze (desktop) albo launcher (mobile)
      window.requestAnimationFrame(() => {
        const navbarButton = document.getElementById(NAVBAR_BUTTON_ID);
        const target = navbarButton && navbarButton.offsetParent !== null ? navbarButton : launcherRef.current;
        target?.focus();
      });
    }
  }

  function toggleFullscreen() {
    setPanelMode(panelMode === "fullscreen" ? "expanded" : "fullscreen");
  }

  function handlePanelKeyDown(event) {
    if (event.key === "Escape") {
      event.stopPropagation();
      collapsePanel();
    }
  }

  const panelClassName = [styles.panel, panelMode === "fullscreen" ? styles.fullscreen : ""]
    .filter(Boolean)
    .join(" ");
  const isFullscreen = panelMode === "fullscreen";
  const hasConversation = turns.length > 0;
  const lastTurn = hasConversation ? turns[turns.length - 1] : null;
  const lastTurnId = lastTurn ? lastTurn.id : null;
  // chip modelu: tylko gdy serwer podał `meta.model` w kroku `answer` ostatniej tury
  const lastModel = lastTurn?.turn.steps.find((step) => step.id === "answer")?.meta?.model;
  const modelChip = typeof lastModel === "string" && lastModel ? lastModel : null;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  usePanelDom(panelMode, hydrated);

  // jeden komunikat dla czytnika: praca / gotowa odpowiedź (błąd ogłasza role="alert" w turze)
  const statusText = loading ? copy.statusWorking : lastTurn && lastTurn.turn.status === "done" ? copy.statusReady : "";

  const panel = isPanelOpen && (
        <section
          id="docs-chat-panel"
          className={panelClassName}
          aria-labelledby="docs-chat-title"
          tabIndex={-1}
          onKeyDown={handlePanelKeyDown}
        >
          <span className={styles.srOnly} role="status" aria-live="polite">
            {statusText}
          </span>
          <PanelHeader
            copy={copy}
            scope={effectiveScope}
            onScopeChange={setScope}
            pageAvailable={pageAvailable}
            hasConversation={hasConversation}
            loading={loading}
            isFullscreen={isFullscreen}
            onClear={clearAndFocus}
            onToggleFullscreen={toggleFullscreen}
            onCollapse={collapsePanel}
          />

          <div className={styles.chatBody} ref={chatBodyRef} onScroll={handleChatScroll}>
            {/* role="log" + aria-busy: AT czeka z ogłoszeniem do końca strumienia (kontrakt §4.3);
                etykieta fazy w osobnym role="status" wyżej */}
            <div className={styles.thread} role="log" aria-live="polite" aria-busy={loading} aria-label={copy.title}>
              {!hasConversation && <EmptyState copy={copy} onAsk={(example) => ask(effectiveScope, example)} />}

              {turns.map((entry) => {
                const isLast = entry.id === lastTurnId;
                const { turn } = entry;
                const hasReasoning = Boolean(turn.reasoning && turn.reasoning.trim());
                // model myśli: reasoning płynie, odpowiedź jeszcze nie zaczęła
                const isThinking = loading && isLast && hasReasoning && !turn.answer;
                return (
                  <React.Fragment key={entry.id}>
                    <div className={`${styles.message} ${styles.userMessage}`}>
                      <p>{entry.prompt}</p>
                    </div>
                    <div className={`${styles.message} ${styles.assistantMessage}`}>
                      <ThinkingTrace
                        steps={turn.steps}
                        reasoning={turn.reasoning}
                        status={turn.status}
                        isThinking={isThinking}
                        durationMs={turnDurationMs(entry)}
                        locale={locale}
                        copy={copy}
                      />
                      {/* karty źródeł PRZED odpowiedzią (retrieval → odpowiedź) — jak w cgc-web */}
                      <ContextCards turnId={entry.id} label={copy.sources} sources={turn.sources} />
                      <StreamingAnswer
                        turnId={entry.id}
                        turn={turn}
                        prompt={entry.prompt}
                        scope={entry.scope}
                        isLast={isLast}
                        loading={loading}
                        copy={copy}
                        feedback={turn.traceId ? feedbackByTrace[turn.traceId] : undefined}
                        onFeedback={sendFeedback}
                        onRetry={retryTurn}
                      />
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <PromptBar
            prompt={prompt}
            onPromptChange={setPrompt}
            onSubmit={submitFromComposer}
            onStop={stop}
            inputRef={inputRef}
            loading={loading}
            startedAt={loading && lastTurn ? lastTurn.startedAt : null}
            model={modelChip}
            locale={locale}
            copy={copy}
          />
        </section>
  );

  return (
    <>
      {mounted && <NavbarEntry open={isPanelOpen} onOpen={openPanel} onCollapse={collapsePanel} copy={copy} resetKey={permalink} />}
      {!isPanelOpen && (
        <button
          ref={launcherRef}
          type="button"
          className={styles.launcher}
          aria-controls="docs-chat-panel"
          aria-expanded="false"
          onClick={openPanel}
        >
          <span className={styles.launcherIcon} aria-hidden="true">
            <ChatBubbleIcon />
          </span>
          <span>{copy.open}</span>
        </button>
      )}
      {mounted && panel ? createPortal(panel, document.body) : null}
      {mounted && (
        <SelectionActions enabled={selectionEnabled} label={copy.selectionAsk} toolbarLabel={copy.selectionToolbar} onAsk={askAboutSelection} resetKey={permalink} />
      )}
    </>
  );
}
