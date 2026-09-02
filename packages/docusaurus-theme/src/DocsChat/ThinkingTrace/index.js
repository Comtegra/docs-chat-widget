// Ślad pracy asystenta — wzorzec BUI „Thinking" w dwóch wariantach z jednego komponentu
// (plan cgc-web/docs/ai-native-ui-plan.md §7): Steps (kroki `retrieve`/`answer` z ramek `step`
// serwera; domyślny model nie emituje rozumowania) i Reasoning (gdy przyjdą ramki `reasoning`,
// tekst pokazujemy WYŁĄCZNIE jako plain text — nigdy markdown). Nagłówek: shimmer „Myślę…" /
// bieżący krok podczas pracy, „Przemyślane w N s" po zakończeniu. Auto-rozwinięty w trakcie,
// zwija się po zakończeniu — dopóki użytkownik nie przełączy ręcznie (aria-expanded).
import React, { useId, useState } from "react";
import { usePluralForm } from "@docusaurus/theme-common";
import styles from "./styles.module.css";
import { PLURAL_IDS } from "../i18n";
import { formatSeconds } from "../lib/format.mjs";

const STEP_LABEL_KEYS = { retrieve: "stepRetrieve", answer: "stepAnswer" };

/**
 * @param {{
 *   steps: Array<{ id: string, status: "running"|"done"|"failed", meta?: Record<string, unknown> }>,
 *   reasoning: string,
 *   status: "idle"|"running"|"done"|"stopped"|"error",
 *   isThinking: boolean,       // reasoning płynie, odpowiedź jeszcze nie
 *   durationMs: number|null,   // czas tury (turnDurationMs)
 *   locale: string,
 *   copy: Record<string, any>,
 * }} props
 */
export default function ThinkingTrace({ steps, reasoning, status, isThinking, durationMs, locale, copy }) {
  const [manual, setManual] = useState(null);
  const bodyId = useId();
  const { selectMessage } = usePluralForm();
  const running = status === "running";
  const hasReasoning = Boolean(reasoning && reasoning.trim());
  const hasSteps = Array.isArray(steps) && steps.length > 0;

  if (!hasSteps && !hasReasoning) {
    return null;
  }

  const expanded = manual ?? running;
  const runningStep = hasSteps ? steps.find((s) => s.status === "running") : null;
  const stepLabel = (id) => copy[STEP_LABEL_KEYS[id]] || id;

  let label;
  if (running) {
    label = isThinking ? copy.thinking : runningStep ? `${stepLabel(runningStep.id)}…` : copy.thinking;
  } else if (Number.isFinite(durationMs)) {
    label = copy.thoughtFor.replace("{seconds}", formatSeconds(durationMs, locale));
  } else {
    label = hasReasoning ? copy.reasoning : copy.traceDone;
  }

  const stepMeta = (step) => {
    if (step.id === "retrieve" && step.meta && Number.isFinite(step.meta.count)) {
      const count = Number(step.meta.count);
      return selectMessage(count, PLURAL_IDS.fragments()).replace("{count}", String(count));
    }
    if (step.status === "failed") {
      return copy.stepFailed;
    }
    return null;
  };

  return (
    <div className={styles.trace}>
      {/* etykieta widoczna = nazwa dostępna („Przemyślane w 3,2 s"); cel przycisku w title */}
      <button
        type="button"
        className={styles.header}
        aria-expanded={expanded}
        aria-controls={bodyId}
        title={copy.traceToggle}
        onClick={() => setManual((current) => !(current ?? running))}
      >
        <span className={`${styles.spark} ${running ? "" : styles.dim}`} aria-hidden="true" />
        <span className={`${styles.label} ${running ? styles.shimmer : ""}`}>{label}</span>
        <span className={styles.chevron} aria-hidden="true" />
      </button>
      <div id={bodyId} className={`${styles.body} ${expanded ? styles.open : ""}`} aria-hidden={!expanded}>
        <div>
          {hasSteps && (
            <ol className={styles.steps}>
              {steps.map((step) => {
                const meta = stepMeta(step);
                return (
                  <li key={step.id} className={`${styles.step} ${styles[step.status] || ""}`}>
                    <span className={styles.marker} aria-hidden="true" />
                    <span className={styles.stepLabel}>{stepLabel(step.id)}</span>
                    {meta && <span className={styles.stepMeta}>{meta}</span>}
                  </li>
                );
              })}
            </ol>
          )}
          {hasReasoning && (
            <>
              <div className={styles.reasoningTitle}>{copy.reasoning}</div>
              <div className={styles.reasoning}>{reasoning}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
