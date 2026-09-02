// Zaznaczenie w treści dokumentu → „Zapytaj CGC o to" (E5, plan §10). Nasłuch `selectionchange`
// (debounce 150 ms; nie w trakcie przeciągania — pointerdown/pointerup), tylko gdy zaznaczenie leży
// w `article` poza nawigacją/stopką/`pre`/kontrolkami i poza panelem (lib/selection.mjs:
// isAskableAncestry — sprawdzany początek zaznaczenia i wspólny przodek; koniec może wpaść na
// offset 0 następnego bloku, np. `pre` — to nadal zaznaczony akapit). Wyłączone na urządzeniach
// dotykowych bez wskaźnika (any-pointer: coarse i any-hover: none — natywne menu zaznaczenia;
// hybrydy z myszą/trackpadem zostają włączone; ocena raz, przy montażu). Pasek nad zaznaczeniem albo pod nim,
// gdy u góry brakuje miejsca (sticky navbar). Klawiatura: gdy pasek jest widoczny i fokus jest na
// stronie (body/article), PIERWSZY Tab przenosi fokus na jego przycisk (kolejne Taby normalnie);
// Escape na przycisku/stronie chowa pasek i oddaje fokus tam, skąd przyszedł. Klik/Enter: prompt z
// szablonu (i18n) trafia do composera z zakresem „ta strona" — bez automatycznej wysyłki.
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./styles.module.css";
import { ChatBubbleIcon } from "../icons";
import { isAskableAncestry, normalizeSelectionText } from "../lib/selection.mjs";

const DEBOUNCE_MS = 150;
const BAR_HEIGHT = 40; // 2rem przycisk + odstęp
const NAVBAR_HEIGHT_FALLBACK = 60; // --ifm-navbar-height 3.75rem

function navbarHeight() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--ifm-navbar-height").trim();
  const px = raw.endsWith("rem") ? parseFloat(raw) * parseFloat(getComputedStyle(document.documentElement).fontSize) : parseFloat(raw);
  return Number.isFinite(px) && px > 0 ? px : NAVBAR_HEIGHT_FALLBACK;
}

/** @param {Node|null} node */
function ancestryOf(node) {
  const out = [];
  let el = node && node.nodeType === Node.ELEMENT_NODE ? /** @type {Element} */ (node) : node?.parentElement ?? null;
  while (el && el !== document.body) {
    out.push({ tag: el.tagName, id: el.id || "", className: typeof el.className === "string" ? el.className : "" });
    el = el.parentElement;
  }
  return out;
}

/** fokus „na stronie": body albo wewnątrz treści dokumentu — nie w panelu, dialogu czy polu formularza */
function focusIsOnPage() {
  const active = document.activeElement;
  if (!active || active === document.body) return true;
  if (active.closest("#docs-chat-panel, [role=dialog], input, textarea, select, button")) return false;
  return Boolean(active.closest("article"));
}

const TOUCH_ONLY_QUERY = "(any-pointer: coarse) and (any-hover: none)";
const EDGE_GAP = 8;

/**
 * @param {{ enabled: boolean, label: string, toolbarLabel: string, onAsk: (text: string) => void, resetKey?: string }} props
 */
export default function SelectionActions({ enabled, label, toolbarLabel, onAsk, resetKey }) {
  const [state, setState] = useState(/** @type {{ text: string, x: number, y: number, placement: "above"|"below" } | null} */ (null));
  const buttonRef = useRef(/** @type {HTMLButtonElement|null} */ (null));
  const barRef = useRef(/** @type {HTMLDivElement|null} */ (null));
  const timerRef = useRef(/** @type {ReturnType<typeof setTimeout>|null} */ (null));
  const draggingRef = useRef(false);
  const returnFocusRef = useRef(/** @type {HTMLElement|null} */ (null));
  const tabUsedRef = useRef(false);
  const visible = state !== null;

  // zmiana strony (SPA): stary pasek nie może zostać nad nową treścią
  useEffect(() => {
    setState(null);
  }, [resetKey]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return undefined;
    if (window.matchMedia && window.matchMedia(TOUCH_ONLY_QUERY).matches) return undefined;

    const evaluate = () => {
      if (draggingRef.current) return;
      const selection = document.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        setState(null);
        return;
      }
      const text = normalizeSelectionText(selection.toString());
      const range = selection.getRangeAt(0);
      if (!text || !isAskableAncestry(ancestryOf(range.startContainer)) || !isAskableAncestry(ancestryOf(range.commonAncestorContainer))) {
        setState(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      if (!rect || (rect.width === 0 && rect.height === 0)) {
        setState(null);
        return;
      }
      const x = rect.left + rect.width / 2; // clamp do krawędzi po zmierzeniu paska (useLayoutEffect)
      const roomAbove = rect.top - navbarHeight() >= BAR_HEIGHT;
      tabUsedRef.current = false; // nowe zaznaczenie → Tab znów prowadzi na pasek
      setState({ text, x, y: roomAbove ? rect.top : rect.bottom, placement: roomAbove ? "above" : "below" });
    };
    const onSelectionChange = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(evaluate, DEBOUNCE_MS);
    };
    const onPointerDown = (event) => {
      draggingRef.current = true;
      // start nowego zaznaczenia poza paskiem → stary pasek znika od razu (nie stoi z nieaktualnym tekstem)
      if (!(event.target instanceof Node && barRef.current?.contains(event.target))) setState(null);
    };
    const onPointerUp = () => {
      draggingRef.current = false;
      onSelectionChange();
    };
    const hide = () => setState(null);
    document.addEventListener("selectionchange", onSelectionChange);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("pointerup", onPointerUp, true);
    window.addEventListener("scroll", hide, { passive: true, capture: true });
    window.addEventListener("resize", hide);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      document.removeEventListener("selectionchange", onSelectionChange);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("pointerup", onPointerUp, true);
      window.removeEventListener("scroll", hide, { capture: true });
      window.removeEventListener("resize", hide);
    };
  }, [enabled]);

  // clamp x po zmierzeniu realnej szerokości paska (etykieta i18n / font mogą się zmienić)
  useLayoutEffect(() => {
    const el = barRef.current;
    if (!el || !state) return;
    const half = el.offsetWidth / 2 + EDGE_GAP;
    const clamped = Math.min(Math.max(state.x, half), window.innerWidth - half);
    if (Math.abs(clamped - state.x) > 0.5) {
      setState((current) => (current ? { ...current, x: clamped } : current));
    }
  }, [state]);

  // klawiatura: pierwszy Tab (fokus na stronie) → przycisk paska; Escape → schowaj + oddaj fokus
  useEffect(() => {
    if (!visible) {
      tabUsedRef.current = false;
      return undefined;
    }
    const onKeyDown = (event) => {
      const onBar = document.activeElement === buttonRef.current;
      if (event.key === "Escape" && (onBar || focusIsOnPage())) {
        event.stopPropagation();
        setState(null);
        if (onBar) returnFocusRef.current?.focus?.();
        return;
      }
      if (event.key === "Tab" && !event.shiftKey && !tabUsedRef.current && !onBar && focusIsOnPage() && buttonRef.current) {
        event.preventDefault();
        tabUsedRef.current = true;
        returnFocusRef.current = /** @type {HTMLElement|null} */ (document.activeElement);
        buttonRef.current.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [visible]);

  const ask = useCallback(() => {
    if (!state) return;
    const { text } = state;
    setState(null);
    document.getSelection()?.removeAllRanges();
    onAsk(text);
  }, [state, onAsk]);

  if (!state) return null;
  return createPortal(
    <div
      id="docs-chat-selection"
      ref={barRef}
      role="toolbar"
      aria-label={toolbarLabel}
      className={styles.bar}
      data-placement={state.placement}
      style={{ left: state.x, top: state.y }}
    >
      <button ref={buttonRef} type="button" className={styles.button} onMouseDown={(event) => event.preventDefault()} onClick={ask}>
        <span className={styles.icon} aria-hidden="true">
          <ChatBubbleIcon size={14} />
        </span>
        {label}
      </button>
    </div>,
    document.body
  );
}
