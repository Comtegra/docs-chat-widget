// Zakres pytania jako segment „Ta strona | Cała dokumentacja" — role=radiogroup z dwoma
// role=radio (strzałki lewo/prawo/góra/dół przełączają, Home/End skrajne). Poza stronami docs
// (brak permalinku) opcja „Ta strona" jest aria-disabled z podpowiedzią. Style w module panelu.
import React, { useId, useRef } from "react";
import styles from "../styles.module.css";

const OPTIONS = /** @type {const} */ (["page", "all"]);

/**
 * @param {{ scope: "all"|"page", onChange: (scope: "all"|"page") => void, pageAvailable: boolean, copy: any }} props
 */
export default function ScopeSwitch({ scope, onChange, pageAvailable, copy }) {
  const refs = useRef(/** @type {Record<string, HTMLButtonElement|null>} */ ({}));
  const hintId = useId();
  const labelFor = (option) => (option === "page" ? copy.page : copy.all);

  function move(from, delta) {
    const enabled = OPTIONS.filter((o) => o !== "page" || pageAvailable);
    const index = enabled.indexOf(from);
    const next = enabled[(index + delta + enabled.length) % enabled.length];
    onChange(next);
    refs.current[next]?.focus();
  }

  /** @param {React.KeyboardEvent} event @param {"page"|"all"} option */
  function handleKeyDown(event, option) {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") { event.preventDefault(); move(option, 1); }
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") { event.preventDefault(); move(option, -1); }
    else if (event.key === "Home") { event.preventDefault(); const first = pageAvailable ? "page" : "all"; onChange(first); refs.current[first]?.focus(); }
    else if (event.key === "End") { event.preventDefault(); onChange("all"); refs.current.all?.focus(); }
  }

  return (
    <div className={styles.scopeSwitch} role="radiogroup" aria-label={copy.scopeLabel}>
      {OPTIONS.map((option) => {
        const disabled = option === "page" && !pageAvailable;
        const checked = scope === option;
        return (
          <button
            key={option}
            ref={(node) => { refs.current[option] = node; }}
            type="button"
            role="radio"
            className={styles.scopeOption}
            aria-checked={checked}
            aria-disabled={disabled || undefined}
            aria-describedby={disabled ? hintId : undefined}
            title={disabled ? copy.pageUnavailable : undefined}
            // roving tabindex: fokus dostaje zaznaczona opcja (lub pierwsza dostępna)
            tabIndex={checked ? 0 : -1}
            onClick={() => { if (!disabled) onChange(option); }}
            onKeyDown={(event) => handleKeyDown(event, option)}
          >
            {labelFor(option)}
          </button>
        );
      })}
      {/* powód niedostępności „Ta strona" także dla czytników (title jest tylko dla myszy) */}
      {!pageAvailable ? <span id={hintId} className={styles.srOnly}>{copy.pageUnavailable}</span> : null}
    </div>
  );
}
