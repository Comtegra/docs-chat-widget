# @comtegra/docs-chat-client

## 0.2.1

### Patch Changes

- 06e5eee: Schemat ramki `done`: opcjonalne pole `aiGenerated` (oznaczenie AI Act z gatewaya LLM, addytywne).

## 0.2.0

### Minor Changes

- 76f2dc5: Twardsze granice zaufania: id wdrożenia (`client`) tylko `[A-Za-z0-9_-]{1,64}` (ZMIANA KONTRAKTU dla integracji IIFE — dotychczasowe wartości z `=`/`+`/`/` będą odrzucane), limit długości linii SSE (1 MB, mierzony na niedokończonej linii), ścisła walidacja migawki rozmowy przy odtwarzaniu, eksport `CLIENT_ID_PATTERN`/`isValidClientId`.
