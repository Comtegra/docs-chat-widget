# @comtegra/docusaurus-theme-docs-chat

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
