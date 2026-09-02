// Pusty stan panelu: tytuł, podpowiedź, przykładowe pytania jako przyciski. Prezentacyjny.
import React from "react";
import styles from "../styles.module.css";
import { ChatBubbleIcon } from "../icons";

/** @param {{ copy: any, onAsk: (example: string) => void }} props */
export default function EmptyState({ copy, onAsk }) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon} aria-hidden="true">
        <ChatBubbleIcon size={22} />
      </div>
      <h3 className={styles.emptyTitle}>{copy.emptyTitle}</h3>
      <p className={styles.emptyHint}>{copy.emptyHint}</p>
      <div className={styles.exampleList}>
        {copy.examples.map((example) => (
          <button key={example} type="button" className={styles.exampleChip} onClick={() => onAsk(example)}>
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
