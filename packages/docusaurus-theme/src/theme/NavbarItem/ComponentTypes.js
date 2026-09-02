// Typ elementu navbara `custom-docsChat` (oficjalny punkt rozszerzeń theme-classic:
// walidacja przepuszcza typy custom-*). Konfiguracja strony:
//   navbar.items: [{ type: 'custom-docsChat', position: 'right' }]
// Element renderuje tylko SLOT — właściwy przycisk portaluje do niego DocsChat/NavbarEntry
// (przycisk musi żyć w drzewie panelu: dzieli z nim stan otwarcia, aria-expanded i fokus).
import React from "react";
import ComponentTypes from "@theme-init/NavbarItem/ComponentTypes";

function DocsChatNavbarItem() {
  return (
    <span className="docs-chat-navbar-item">
      <span className="docs-chat-navbar-slot" />
    </span>
  );
}

export default {
  ...ComponentTypes,
  "custom-docsChat": DocsChatNavbarItem,
};
