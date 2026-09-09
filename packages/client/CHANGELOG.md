# @comtegra/docs-chat-client

## 0.3.0

### Minor Changes

- 3b59674: Token strony dla dokumentacji niepublicznej: `streamDocsChat` przyjmuje `headers`, paczka eksportuje `SITE_TOKEN_HEADER` i `DocsChatRequestError` (ze statusem HTTP), reducer zna notice `unauthorized`; theme dostaje opcję `siteToken` (nagłówek `X-Site-Token` w czacie i feedbacku, osobny komunikat przy 401/403). Schemat statusu: pole `auth.siteToken`.

## 0.2.1

### Patch Changes

- 06e5eee: Schemat ramki `done`: opcjonalne pole `aiGenerated` (oznaczenie AI Act z gatewaya LLM, addytywne).

## 0.2.0

### Minor Changes

- 76f2dc5: Twardsze granice zaufania: id wdrożenia (`client`) tylko `[A-Za-z0-9_-]{1,64}` (ZMIANA KONTRAKTU dla integracji IIFE — dotychczasowe wartości z `=`/`+`/`/` będą odrzucane), limit długości linii SSE (1 MB, mierzony na niedokończonej linii), ścisła walidacja migawki rozmowy przy odtwarzaniu, eksport `CLIENT_ID_PATTERN`/`isValidClientId`.
