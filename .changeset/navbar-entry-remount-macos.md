---
"@comtegra/docusaurus-theme-docs-chat": patch
---

Przycisk w navbarze nie znika już przy nawigacji między typami stron (np. strona główna → dokumentacja → strona własna): Docusaurus montuje wtedy navbar od nowa, a portal przycisku przepina się do nowego slotu (obserwator mutacji) zamiast zostawać w odłączonym węźle aż do odświeżenia. Podpowiedź skrótu na macOS w przeglądarkach Chromium (Chrome, Edge, Brave) pokazuje ⌘+/ zamiast Ctrl+/ — `navigator.userAgentData.platform` zwraca „macOS", a dopasowanie było czułe na wielkość liter. Oba problemy zgłosił i zdiagnozował zespół e-Instytucji.
