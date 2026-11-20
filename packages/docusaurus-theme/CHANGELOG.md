# @comtegra/docusaurus-theme-docs-chat

## 0.4.0

### Minor Changes

- c4761b8: `tenant` is optional: without it the widget talks to docs-chat-api v2 (`/api/v1/chat|feedback|status`, one instance = one documentation site). With `tenant` the v1 multi-tenant routes stay unchanged.

## 0.3.1

### Patch Changes

- 8617109: Przycisk w navbarze nie znika już przy nawigacji między typami stron (np. strona główna → dokumentacja → strona własna): Docusaurus montuje wtedy navbar od nowa, a portal przycisku przepina się do nowego slotu (obserwator mutacji) zamiast zostawać w odłączonym węźle aż do odświeżenia. Podpowiedź skrótu na macOS w przeglądarkach Chromium (Chrome, Edge, Brave) pokazuje ⌘+/ zamiast Ctrl+/ — `navigator.userAgentData.platform` zwraca „macOS", a dopasowanie było czułe na wielkość liter. Oba problemy zgłosił i zdiagnozował zespół e-Instytucji.

## 0.3.0

### Minor Changes

- 3b59674: Token strony dla dokumentacji niepublicznej: `streamDocsChat` przyjmuje `headers`, paczka eksportuje `SITE_TOKEN_HEADER` i `DocsChatRequestError` (ze statusem HTTP), reducer zna notice `unauthorized`; theme dostaje opcję `siteToken` (nagłówek `X-Site-Token` w czacie i feedbacku, osobny komunikat przy 401/403). Schemat statusu: pole `auth.siteToken`.

### Patch Changes

- Updated dependencies [3b59674]
  - @comtegra/docs-chat-client@0.3.0

## 0.2.0

### Minor Changes

- 1bd7e3a: Opcja `externalLinks` (`"allow"` | `"text"`), `apiBaseUrl` po `http:` tylko dla localhost, węższy charset `?r=`, twardy limit czasu tury (5 min), etykieta „propozycja startowa" dla każdej komendy shellowej, sekcja „Bezpieczeństwo i prywatność" w README.

### Patch Changes

- Updated dependencies [76f2dc5]
  - @comtegra/docs-chat-client@0.2.0
