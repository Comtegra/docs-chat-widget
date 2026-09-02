// Wejście do Ask CGC w navbarze (E6): navbar.items ma pusty slot `type: "html"`
// (`<span class="docs-chat-navbar-slot">`); TU renderujemy do niego portalem przycisk — bez
// swizzle'owania Navbara, z i18n, aria-expanded/aria-controls i podpowiedzią skrótu.
// Przycisk to disclosure (aria-expanded): klik PRZEŁĄCZA — otwiera zwinięty panel, zwija otwarty.
// Skrót klawiszowy Ctrl+/ (⌘+/ na macOS) tylko otwiera / przenosi fokus na composer (zamyka
// Escape); nie koliduje z Ctrl+K wyszukiwarki ani ze skrótami przeglądarek. Na mobile navbar chowa
// elementy do menu — wtedy wejściem jest launcher w rogu (DocsChat), a slot jest niewidoczny.
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "../styles.module.css";
import { ChatBubbleIcon } from "../icons";
import { isOpenShortcut } from "../lib/shortcut.mjs";

export const NAVBAR_SLOT_SELECTOR = ".navbar__items--right .docs-chat-navbar-slot";
export const NAVBAR_BUTTON_ID = "docs-chat-navbar-open";

/**
 * @param {{ open: boolean, onOpen: () => void, onCollapse: () => void, copy: any, resetKey?: string|null }} props
 */
export default function NavbarEntry({ open, onOpen, onCollapse, copy, resetKey }) {
  const [slot, setSlot] = useState(/** @type {Element|null} */ (null));

  // slot żyje w Navbarze (trwałym między trasami). Efekt idzie przy zmianie slotu lub trasy
  // (`resetKey`): tanie `isConnected`, zapytanie DOM tylko, gdy slotu nie ma lub został odłączony.
  useEffect(() => {
    if (slot && slot.isConnected) return;
    const found = document.querySelector(NAVBAR_SLOT_SELECTOR);
    if (found !== slot) setSlot(found);
  }, [slot, resetKey]);

  useEffect(() => {
    /** @param {KeyboardEvent} event */
    const onKeyDown = (event) => {
      if (!isOpenShortcut(event)) return;
      event.preventDefault();
      onOpen();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onOpen]);

  if (!slot) return null;
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || "");
  return createPortal(
    <button
      id={NAVBAR_BUTTON_ID}
      type="button"
      className={styles.navbarButton}
      aria-expanded={open}
      aria-controls="docs-chat-panel"
      aria-keyshortcuts="Control+/ Meta+/"
      aria-label={copy.open}
      title={open ? copy.minimize : isMac ? copy.shortcutHintMeta : copy.shortcutHintCtrl}
      onClick={open ? onCollapse : onOpen}
    >
      <span className={styles.navbarIcon} aria-hidden="true">
        <ChatBubbleIcon size={15} />
      </span>
      <span className={styles.navbarLabel}>{copy.open}</span>
      <span className={styles.navbarKbd} aria-hidden="true">
        <kbd>{isMac ? "⌘" : "Ctrl"}</kbd>
        <kbd>/</kbd>
      </span>
    </button>,
    slot
  );
}
