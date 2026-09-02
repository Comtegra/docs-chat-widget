// Blok kodu w odpowiedzi: @theme/CodeBlock Docusaurusa (Prism z motywem strony, przycisk
// „Kopiuj", ten sam wygląd co w docs). react-markdown daje nam <pre><code class="language-x">…
// — nadpisujemy TYLKO `pre` i rozpakowujemy `code`; inline `code` zostaje domyślne.
// Alias języków shellowych → bash (zarejestrowany w prism.additionalLanguages). Polecenia
// `cgc …` dostają etykietę „propozycja startowa" (plan §7: model może się mylić w flagach —
// użytkownik ma to zweryfikować, zanim uruchomi).
//
// Zawijanie wierszy: przycisk motywu (WordWrapButton, i18n `theme.CodeBlock.wordWrapToggle`) pokazuje
// się, gdy kod nie mieści się na szerokość — ale motyw mierzy to TYLKO przy montażu bloku i resize
// okna (useCodeWordWrap). W strumieniu blok montuje się przy pierwszych znakach fence'a (krótki, „mieści
// się") i rośnie bez ponownego pomiaru; szerokość panelu zmienia się bez resize okna (szuflada ↔
// pełny ekran). Dlatego blok motywu dostaje `key` = (tura zakończona, szerokość karty): przy zmianie
// montuje się na nowo i mierzy poprawnie (React: reset stanu przez key). Koszt: jedno ponowne
// podświetlenie na blok przy zakończeniu tury / zmianie szerokości; włączone zawijanie resetuje się
// wtedy do stanu domyślnego (świadomie — prościej niż własny przycisk dublujący motyw).
import React, { useLayoutEffect, useRef, useState } from "react";
import ThemeCodeBlock from "@theme/CodeBlock";
import styles from "./styles.module.css";
import { languageFromClassName, isCgcProposal } from "../lib/codeLanguage.mjs";

/** @param {unknown} node */
function textOf(node) {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (node && typeof node === "object" && "props" in node) {
    return textOf(/** @type {{ props?: { children?: unknown } }} */ (node).props?.children);
  }
  return "";
}

/** Rośnie, gdy zmieni się szerokość karty (po pierwszym pomiarze) — część `key` bloku motywu. */
function useWidthEpoch(ref) {
  const [epoch, setEpoch] = useState(0);
  const lastWidth = useRef(/** @type {number|null} */ (null));
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const measure = (width) => {
      const rounded = Math.round(width);
      if (lastWidth.current !== null && rounded !== lastWidth.current) setEpoch((value) => value + 1);
      lastWidth.current = rounded;
    };
    measure(element.getBoundingClientRect().width);
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver((entries) => measure(entries[0].contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return epoch;
}

/**
 * @param {{ children: React.ReactNode, proposalLabel: string, settled?: boolean }} props
 *   settled — tura zakończona (treść bloku już nie rośnie)
 */
export default function CodeBlock({ children, proposalLabel, settled = true }) {
  const child = React.Children.toArray(children)[0];
  const className = child && typeof child === "object" && "props" in child ? child.props.className : undefined;
  const language = languageFromClassName(className);
  const code = textOf(child).replace(/\n$/, "");
  const cardRef = useRef(/** @type {HTMLDivElement|null} */ (null));
  const widthEpoch = useWidthEpoch(cardRef);

  return (
    <div ref={cardRef} className={styles.codeCard}>
      {isCgcProposal(code, language) && <span className={styles.codeBadge}>{proposalLabel}</span>}
      <ThemeCodeBlock key={`${settled ? "settled" : "streaming"}:${widthEpoch}`} language={language}>
        {code}
      </ThemeCodeBlock>
    </div>
  );
}
