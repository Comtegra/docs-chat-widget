// Wejście do czatu w navbarze: navbar.items ma element `type: "custom-docsChat"` (theme/NavbarItem/
// ComponentTypes), który renderuje pusty slot `<span class="docs-chat-navbar-slot">`; TU renderujemy do
// niego portalem przycisk — bez swizzle'owania Navbara, z i18n, aria-expanded/aria-controls i podpowiedzią
// skrótu. Przycisk to disclosure (aria-expanded): klik PRZEŁĄCZA — otwiera zwinięty panel, zwija otwarty.
// Skrót klawiszowy Ctrl+/ (⌘+/ na macOS) tylko otwiera / przenosi fokus na composer (zamyka
// Escape); nie koliduje z Ctrl+K wyszukiwarki ani ze skrótami przeglądarek. Na mobile navbar chowa
// elementy do menu — wtedy wejściem jest launcher w rogu (DocsChat), a slot jest niewidoczny.
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "../styles.module.css";
import { ChatBubbleIcon } from "../icons";
import { detectPlatform, isApplePlatform, isOpenShortcut } from "../lib/shortcut.mjs";

export const NAVBAR_SLOT_SELECTOR = ".navbar__items--right .docs-chat-navbar-slot";
export const NAVBAR_BUTTON_ID = "docs-chat-navbar-open";

/**
 * @param {{ open: boolean, onOpen: () => void, onCollapse: () => void, copy: any }} props
 */
export default function NavbarEntry({ open, onOpen, onCollapse, copy }) {
  const [slot, setSlot] = useState(/** @type {Element|null} */ (null));

  // Navbar NIE jest trwały między trasami: każdy typ strony (docs, strona główna, strony z src/pages)
  // renderuje własny <Layout>, więc przejście między typami montuje navbar od nowa i slot dostaje nowy
  // węzeł. Efekt zależny od trasy tego nie łapie: Docusaurus zmienia lokalizację (i permalink) PRZED
  // doładowaniem chunka nowej strony, więc taki efekt widział jeszcze stary, podłączony slot, a przycisk
  // zostawał w węźle, który za chwilę wypadał z DOM (zgłoszenie e-Instytucji). Dlatego obserwator
  // mutacji na drzewie aplikacji: gdy bieżący slot został odłączony, szukamy nowego i przepinamy portal.
  // Panel to portal do <body>, więc strumień odpowiedzi nie budzi obserwatora; przy podłączonym slocie
  // updater zwraca ten sam stan i React nie renderuje ponownie.
  useEffect(() => {
    const sync = () =>
      setSlot((current) => (current && current.isConnected ? current : document.querySelector(NAVBAR_SLOT_SELECTOR)));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.getElementById("__docusaurus") || document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

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
  const isMac = isApplePlatform(detectPlatform());
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
