// Skutki uboczne trybu panelu w DOM poza drzewem React (E6):
//  - `html[data-docs-chat]` = tryb (custom.css odsuwa treść docs, gdy jest miejsce) + `data-docs-chat-ready`
//    (przejście padding-right dopiero po montażu; skrypt z headTags ustawia tryb przed hydratacją).
//    Bez czyszczenia przy odmontowaniu — wrap Root nie remontuje się przy nawigacji, a jedyny
//    realny unmount to crash panelu (atrybuty zdejmuje wtedy DocsChatCrashed w theme/Root).
//  - pełny ekran: reszta dokumentu (#__docusaurus) `inert` — panel jest portalem poza nim.
import { useEffect } from "react";

/**
 * @param {"collapsed"|"expanded"|"fullscreen"} panelMode
 * @param {boolean} hydrated  po odtworzeniu migawki — wcześniej atrybutu nie ruszamy (skrypt z headTags
 *   ustawił już tryb przed hydratacją; stan „collapsed" z SSR nie może go na chwilę nadpisać)
 */
export default function usePanelDom(panelMode, hydrated) {
  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.setAttribute("data-docs-chat", panelMode);
    document.documentElement.setAttribute("data-docs-chat-ready", "");
  }, [panelMode, hydrated]);

  useEffect(() => {
    if (panelMode !== "fullscreen" || typeof document === "undefined") return undefined;
    const root = document.getElementById("__docusaurus");
    if (!root) return undefined;
    root.setAttribute("inert", "");
    return () => root.removeAttribute("inert");
  }, [panelMode]);
}
