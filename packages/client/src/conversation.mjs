// @ts-check
// Czysty reducer stanu JEDNEJ tury rozmowy — kontrakt współdzielony z backendem docs-chat
// (plan kontrakt SSE v2: „ten sam kształt reducera w docs"). Repo nie
// współdzielą paczki (decyzja: kontrakt, nie paczka), więc semantyka jest tu powtórzona 1:1;
// przy zmianie kształtu zmieniamy OBA pliki. Docs dokłada warstwę wątku (wiele tur) poniżej —
// `reduceThread`. Bez React, testowalne w node:test.
//
// Kształt stanu jest PRZYPIĘTY (kontrakt między repo):
//   status  idle | running | done | stopped | error
//   notice  null | unsafe | pricing | rate_limited | no_context | unauthorized | timeout | error
//   traceId null | string (z ramki `done`; klucz feedbacku)
//   steps   [{ id, status: running|done|failed, meta? }] w kolejności pojawienia
//   sources [] (kształt zależny od źródła: docs — SseSource; web — obiekty /api/vdb/query)
//   answer  string (sklejone ramki `content`), reasoning string (sklejone `reasoning`)
//   prompt  string|null (ostatnie pytanie użytkownika)
//
// Zdarzenia = ramki SSE (`sources`, `step`, `reasoning`, `content`, `done`, `error`) +
//   { type: "start", prompt }                    — nowe pytanie (reset)
//   { type: "abort", reason: "stopped"|"timeout" } — Stop użytkownika / brak aktywności
// `error.code` obejmuje kody serwera (invalid_request | rate_limited | no_context | llm_error),
// klienckie (unsafe | pricing — klasyfikatory site-chatu; nie są błędami: status "done")
// i transportowe (unauthorized — HTTP 401/403 zamiast strumienia: brak/zły token strony).
//
// Reguły: przy `error`/`abort` ostatni krok „running" → „failed" (serwer docs też to wysyła
// — reducer jest tu defensywny, żeby web z krokami klienckimi zachowywał się tak samo);
// `sources` NIE jest tworzone na nowo przy ramkach `content` (tożsamość dla React.memo).

/** @typedef {"idle"|"running"|"done"|"stopped"|"error"} ConversationStatus */
/** @typedef {null|"unsafe"|"pricing"|"rate_limited"|"no_context"|"unauthorized"|"timeout"|"error"} ConversationNotice */
/** @typedef {{ id: string, status: "running"|"done"|"failed", meta?: Record<string, unknown> }} ConversationStep */
/**
 * @typedef {{
 *   status: ConversationStatus,
 *   notice: ConversationNotice,
 *   traceId: string|null,
 *   steps: ConversationStep[],
 *   sources: unknown[],
 *   answer: string,
 *   reasoning: string,
 *   prompt: string|null,
 * }} ConversationState
 */
/**
 * @typedef {import("./sse.mjs").SseFrame
 *   | { type: "start", prompt: string }
 *   | { type: "abort", reason: "stopped"|"timeout" }
 *   | { type: "error", code: string, message?: string }
 * } ConversationEvent
 */

/** @type {ConversationState} */
export const initialState = Object.freeze({
  status: "idle",
  notice: null,
  traceId: null,
  // zamrożone tablice: Object.freeze jest płytki, a `start` współdzieli te instancje —
  // reducer nigdy nie mutuje (spread/map), ale mutacja przez konsumenta ma rzucać, nie wyciekać
  steps: /** @type {ConversationStep[]} */ (/** @type {unknown} */ (Object.freeze([]))),
  sources: /** @type {unknown[]} */ (/** @type {unknown} */ (Object.freeze([]))),
  answer: "",
  reasoning: "",
  prompt: null,
});

/**
 * Kod błędu (serwer + klient) → notice dla widoku. Nieznany kod → "error".
 * @param {string} code
 * @returns {Exclude<ConversationNotice, null>}
 */
export function noticeForErrorCode(code) {
  switch (code) {
    case "unsafe":
    case "pricing":
    case "rate_limited":
    case "no_context":
    case "unauthorized":
      return code;
    default:
      // `timeout` nie jest kodem błędu serwera — to zdarzenie `abort{reason:"timeout"}`
      return "error";
  }
}

/**
 * @param {ConversationStep[]} steps
 * @param {"done"|"failed"} status
 */
function closeRunningSteps(steps, status) {
  if (!steps.some((step) => step.status === "running")) {
    return steps;
  }
  return steps.map((step) => (step.status === "running" ? { ...step, status } : step));
}

/**
 * @param {ConversationState} state
 * @param {ConversationEvent} event
 * @returns {ConversationState}
 */
export function reduce(state, event) {
  switch (event.type) {
    case "start":
      return { ...initialState, status: "running", prompt: event.prompt };

    case "step": {
      if (state.status !== "running") {
        return state;
      }
      const next = { id: event.id, status: event.status, ...(event.meta ? { meta: event.meta } : {}) };
      const index = state.steps.findIndex((step) => step.id === event.id);
      const steps =
        index === -1
          ? [...state.steps, next]
          : state.steps.map((step, i) => (i === index ? { ...step, ...next } : step));
      return { ...state, steps };
    }

    case "sources":
      return state.status === "running" ? { ...state, sources: event.sources } : state;

    case "reasoning":
      // pusta delta = brak zmiany → ta sama referencja (bez re-renderu)
      return state.status === "running" && event.content
        ? { ...state, reasoning: state.reasoning + event.content }
        : state;

    case "content":
      return state.status === "running" && event.content
        ? { ...state, answer: state.answer + event.content }
        : state;

    case "done":
      if (state.status !== "running") {
        return state;
      }
      return {
        ...state,
        status: "done",
        traceId: event.traceId ?? null,
        steps: closeRunningSteps(state.steps, "done"),
      };

    case "error": {
      if (state.status !== "running") {
        return state;
      }
      const notice = noticeForErrorCode(event.code);
      // klasyfikatory site-chatu: to nie błędy — rozmowa kończy się stanem terminalnym
      if (notice === "unsafe") {
        return { ...state, status: "done", notice, steps: [] };
      }
      if (notice === "pricing") {
        return { ...state, status: "done", notice, steps: closeRunningSteps(state.steps, "done") };
      }
      return { ...state, status: "error", notice, steps: closeRunningSteps(state.steps, "failed") };
    }

    case "abort":
      if (state.status !== "running") {
        return state;
      }
      return {
        ...state,
        status: "stopped",
        notice: event.reason === "timeout" ? "timeout" : null,
        steps: closeRunningSteps(state.steps, "failed"),
      };

    default:
      return state;
  }
}

export const selectors = {
  /** @param {ConversationState} s */
  loading: (s) => s.status === "running",
  /** @param {ConversationState} s */
  notice: (s) => s.notice,
  /** @param {ConversationState} s */
  answer: (s) => s.answer,
  /** @param {ConversationState} s */
  sources: (s) => s.sources,
  /**
   * Wiadomości w kształcie gotowym pod historię wieloturową (dziś ≤ 2).
   * @param {ConversationState} s
   * @returns {Array<{ role: "user"|"assistant", content: string, traceId?: string|null }>}
   */
  messages: (s) => {
    if (s.prompt === null) {
      return [];
    }
    /** @type {Array<{ role: "user"|"assistant", content: string, traceId?: string|null }>} */
    const messages = [{ role: "user", content: s.prompt }];
    if (s.status !== "idle" && (s.answer || s.status !== "running")) {
      messages.push({ role: "assistant", content: s.answer, traceId: s.traceId });
    }
    return messages;
  },
};

// ---------------------------------------------------------------------------------------------
// Warstwa wątku (docs asystenta dokumentacji): wiele tur w jednym panelu. Każda tura = { id, prompt, scope,
// turn: ConversationState }. Ramki i `abort` trafiają zawsze do OSTATNIEJ tury; `start`
// dodaje nową. `sources` tury zawierają dodatkowo `scope`, żeby „szukaj we wszystkich" po
// `no_context` znało kontekst.

/**
 * @typedef {{
 *   id: string, prompt: string, scope: "page"|"all",
 *   startedAt: number|null,   // ms epoch z eventu `start` (hook podaje `at`; reducer nie woła Date.now)
 *   finishedAt: number|null,  // ms epoch z eventu kończącego turę (`done`/`error`/`abort` z `at`)
 *   turn: ConversationState,
 * }} ThreadTurn
 */
/** @typedef {{ turns: ThreadTurn[] }} ThreadState */

/** @type {ThreadState} */
export const initialThreadState = Object.freeze({ turns: /** @type {ThreadTurn[]} */ (/** @type {unknown} */ (Object.freeze([]))) });

/**
 * Waliduje kształt tury z migawki (`persistable`): id/prompt/scope + turn o kształcie
 * ConversationState (status z listy, tablice steps/sources, stringi answer/reasoning).
 * @param {unknown} value
 * @returns {value is ThreadTurn}
 */
export function isRestorableTurn(value) {
  const t = /** @type {any} */ (value);
  if (!t || typeof t !== "object" || typeof t.id !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(t.id) || typeof t.prompt !== "string") return false;
  if (t.scope !== "page" && t.scope !== "all") return false;
  const turn = t.turn;
  if (!turn || typeof turn !== "object") return false;
  // migawka zawiera tylko tury zakończone (persistable); `running` po odtworzeniu = zawieszony
  // panel bez kontrolera (Stop no-op, aria-busy) — odrzucamy
  if (!["done", "stopped", "error"].includes(turn.status)) return false;
  if (turn.notice !== null && turn.notice !== undefined && typeof turn.notice !== "string") return false;
  if (turn.traceId !== null && turn.traceId !== undefined && typeof turn.traceId !== "string") return false;
  if (!Array.isArray(turn.steps) || !Array.isArray(turn.sources)) return false;
  if (!turn.steps.every((/** @type {any} */ step) => step && typeof step === "object" && typeof step.id === "string" && ["running", "done", "failed"].includes(step.status))) return false;
  // sessionStorage dzieli origin z innymi aplikacjami pod tą samą domeną: pola źródeł muszą być
  // stringami (albo null), inaczej render karty rzuca i ErrorBoundary chowa cały panel
  const stringOrNull = (/** @type {unknown} */ v) => v === null || v === undefined || typeof v === "string";
  if (
    !turn.sources.every(
      (/** @type {any} */ source) =>
        source && typeof source === "object" && typeof source.title === "string" && stringOrNull(source.route) && stringOrNull(source.url) && stringOrNull(source.snippet)
    )
  ) return false;
  if (typeof turn.answer !== "string" || typeof turn.reasoning !== "string") return false;
  return true;
}

/**
 * @param {ThreadState} state
 * @param {(ConversationEvent & { at?: number }) | { type: "start", prompt: string, id: string, scope: "page"|"all", at?: number } | { type: "clear" } | { type: "restore", turns: ThreadTurn[] }} event
 * @returns {ThreadState}
 */
export function reduceThread(state, event) {
  switch (event.type) {
    case "clear":
      return { turns: [] };
    case "restore": {
      // migawka z sessionStorage: obca/stara/uszkodzona nie może wywrócić panelu (i strony docs)
      const turns = Array.isArray(event.turns) ? event.turns.filter(isRestorableTurn) : [];
      return turns.length === 0 && state.turns.length === 0 ? state : { turns };
    }
    case "start": {
      const started = /** @type {{ type: "start", prompt: string, id?: string, scope?: "page"|"all", at?: number }} */ (event);
      const turn = reduce(initialState, { type: "start", prompt: started.prompt });
      return {
        turns: [
          ...state.turns,
          {
            id: started.id ?? String(state.turns.length),
            prompt: started.prompt,
            scope: started.scope ?? "all",
            startedAt: Number.isFinite(started.at) ? /** @type {number} */ (started.at) : null,
            finishedAt: null,
            turn,
          },
        ],
      };
    }
    default: {
      const last = state.turns[state.turns.length - 1];
      if (!last) {
        return state;
      }
      const nextTurn = reduce(last.turn, /** @type {ConversationEvent} */ (event));
      if (nextTurn === last.turn) {
        return state;
      }
      const at = /** @type {{ at?: number }} */ (event).at;
      const finished = last.turn.status === "running" && nextTurn.status !== "running";
      return {
        turns: [
          ...state.turns.slice(0, -1),
          {
            ...last,
            turn: nextTurn,
            finishedAt: finished ? (Number.isFinite(at) ? /** @type {number} */ (at) : null) : last.finishedAt,
          },
        ],
      };
    }
  }
}

/**
 * Czas trwania tury w ms (do etykiety „Przemyślane w N s"); null gdy nieznany (np. tura
 * odtworzona z migawki sprzed wprowadzenia znaczników czasu).
 * @param {ThreadTurn} turn
 * @param {number} [now]  dla tury w toku
 */
export function turnDurationMs(turn, now) {
  if (!Number.isFinite(turn.startedAt)) return null;
  const end = turn.turn.status === "running" ? now : turn.finishedAt;
  if (!Number.isFinite(end)) return null;
  return Math.max(0, /** @type {number} */ (end) - /** @type {number} */ (turn.startedAt));
}

export const threadSelectors = {
  /** @param {ThreadState} s */
  loading: (s) => s.turns.length > 0 && s.turns[s.turns.length - 1].turn.status === "running",
  /** @param {ThreadState} s */
  lastTurn: (s) => (s.turns.length > 0 ? s.turns[s.turns.length - 1] : null),
  /**
   * Snapshot do persystencji: bez `reasoning` (duże, bez wartości po odtworzeniu) i tylko
   * tury zakończone (status ≠ running) — jak dotychczasowe writePersistedChatState.
   * @param {ThreadState} s
   */
  persistable: (s) =>
    s.turns
      .filter((t) => t.turn.status !== "running")
      .map((t) => ({ ...t, turn: { ...t.turn, reasoning: "" } })),
};
