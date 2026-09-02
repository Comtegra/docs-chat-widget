// Nagłówek szuflady Ask CGC (E6): rząd 1 = tytuł/podtytuł + pełny ekran + zwiń; rząd 2 = zakres
// jako segment (ScopeSwitch) + „Nowy czat". Czysto prezentacyjny — stan i handlery z DocsChat.
import React from "react";
import styles from "../styles.module.css";
import ScopeSwitch from "../ScopeSwitch";
import { ExpandIcon, MinimizeIcon, RestoreIcon } from "../icons";

/**
 * @param {{
 *   copy: any, scope: "all"|"page", onScopeChange: (scope: "all"|"page") => void, pageAvailable: boolean,
 *   hasConversation: boolean, loading: boolean, isFullscreen: boolean,
 *   onClear: () => void, onToggleFullscreen: () => void, onCollapse: () => void,
 * }} props
 */
export default function PanelHeader({ copy, scope, onScopeChange, pageAvailable, hasConversation, loading, isFullscreen, onClear, onToggleFullscreen, onCollapse }) {
  const fullscreenLabel = isFullscreen ? copy.restore : copy.expand;
  return (
    <header className={styles.panelHeader}>
      <div className={styles.headerRow}>
        <div className={styles.titleGroup}>
          <h2 id="docs-chat-title" className={styles.title}>
            {copy.title}
          </h2>
          <p className={styles.subtitle}>{copy.subtitle}</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.iconButton} aria-label={fullscreenLabel} title={fullscreenLabel} onClick={onToggleFullscreen}>
            {isFullscreen ? <RestoreIcon /> : <ExpandIcon />}
          </button>
          <button type="button" className={styles.iconButton} aria-label={copy.minimize} title={copy.minimize} onClick={onCollapse}>
            <MinimizeIcon />
          </button>
        </div>
      </div>
      <div className={styles.headerRow}>
        <ScopeSwitch scope={scope} onChange={onScopeChange} pageAvailable={pageAvailable} copy={copy} />
        {hasConversation && (
          <button type="button" className={styles.clearButton} onClick={onClear} disabled={loading}>
            {copy.clear}
          </button>
        )}
      </div>
    </header>
  );
}
