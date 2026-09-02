// Composer (wzorzec BUI „Prompt Bar", plan §7): textarea auto-grow, Enter wysyła, Shift+Enter
// nowa linia, IME-safe. Podczas pracy przycisk Wyślij zamienia się w Stop (abort żądania —
// serwer widzi rozłączenie i przerywa LLM), stopka pokazuje licznik czasu; po odpowiedzi chip
// modelu (tylko gdy serwer podał `meta.model` w kroku `answer` — inaczej nic).
import React, { useEffect, useRef } from "react";
import styles from "./styles.module.css";
import LoadingState from "./LoadingState";
import { StopIcon } from "../icons";

export const MAX_PROMPT_LENGTH = 2000;

/**
 * @param {{
 *   prompt: string, onPromptChange: (v: string) => void, onSubmit: () => void, onStop: () => void,
 *   loading: boolean, startedAt?: number|null, model?: string|null, locale: string, copy: any,
 *   inputRef?: React.RefObject<HTMLTextAreaElement>,
 * }} props
 */
export default function PromptBar({ prompt, onPromptChange, onSubmit, onStop, loading, startedAt, model, locale, copy, inputRef }) {
  const localRef = useRef(null);
  const ref = inputRef || localRef;
  const canSend = prompt.trim().length > 0;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${node.scrollHeight}px`;
  }, [prompt, ref]);

  function handleSubmit(event) {
    event.preventDefault();
    if (loading || !canSend) return; // guard dla aria-disabled (klik/Enter na pustym polu)
    onSubmit();
  }

  function handlePromptKeyDown(event) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent?.isComposing) {
      return;
    }
    event.preventDefault();
    if (prompt.trim().length === 0 || loading) {
      return;
    }
    onSubmit();
  }

  // "Enter to send · Shift+Enter for a new line" → <kbd> wokół nazw klawiszy
  const kbdHint = copy.kbdSend.split(/(Enter|Shift\+Enter)/g).map((part, index) =>
    part === "Enter" || part === "Shift+Enter" ? <kbd key={index}>{part}</kbd> : <span key={index}>{part}</span>
  );

  return (
    <form className={styles.composer} onSubmit={handleSubmit}>
      <div className={styles.inner}>
        <textarea
          ref={ref}
          className={styles.input}
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          onKeyDown={handlePromptKeyDown}
          placeholder={copy.placeholder}
          rows={1}
          maxLength={MAX_PROMPT_LENGTH}
          aria-label={copy.placeholder}
        />
        {/* JEDEN przycisk Wyślij ↔ Stop (ten sam węzeł DOM). Puste pole = aria-disabled + guard w
            handleSubmit, NIE `disabled`: przeglądarka zrzuca fokus z wyłączanego przycisku na <body>
            (Chromium robi to synchronicznie w commicie), a fokus ma zostać w composerze */}
        <button
          type={loading ? "button" : "submit"}
          className={loading ? styles.stop : styles.submit}
          onClick={loading ? onStop : undefined}
          aria-label={loading ? copy.stop : copy.send}
          title={loading ? copy.stop : copy.send}
          aria-disabled={!loading && !canSend ? true : undefined}
        >
          {loading ? <StopIcon /> : "→"}
        </button>
      </div>
      <div className={styles.footer}>
        <span className={styles.kbd}>{kbdHint}</span>
        <span className={styles.meta}>
          <LoadingState startedAt={startedAt} running={loading} locale={locale} copy={copy} />
          {!loading && model && (
            <span className={styles.chip} title={copy.modelChip}>
              {model}
            </span>
          )}
        </span>
      </div>
    </form>
  );
}
