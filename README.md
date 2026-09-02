# docs-chat-widget

Asystent dokumentacji dla stron Docusaurusa: streamujący klient czatu (bez zależności,
działa też poza React — np. w Angular.js) oraz theme Docusaurusa z gotowym widgetem.

| Paczka | Opis |
|---|---|
| `@comtegra/docs-chat-client` | kontrakt SSE (JSON Schema), transport, reducer rozmowy, cytowania |
| `@comtegra/docusaurus-theme-docs-chat` | widget czatu jako theme Docusaurusa 3 (React 18/19) |

Backend nie jest częścią tego repozytorium — paczki rozmawiają z API `docs-chat`
(`/api/v1/{tenant}/chat`, SSE) niezależnie od tego, gdzie jest ono uruchomione.

## Rozwój

```bash
npm ci
npm test
```

Licencja: Apache-2.0.
