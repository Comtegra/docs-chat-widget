# @comtegra/docs-chat-client

Streamujący klient asystenta dokumentacji (API `docs-chat`, `/api/v1/{tenant}/chat`) plus
kontrakt SSE jako dane (`schemas/`). Zero zależności; przeglądarka (fetch + ReadableStream)
i Node ≥ 20. Nadaje się też do integracji poza Reactem (np. Angular.js).

```js
import { streamDocsChat, reduceThread, initialThreadState } from "@comtegra/docs-chat-client";

await streamDocsChat({
  apiUrl: "https://<host>/api/v1/ezd/chat",
  body: { prompt: "Jak założyć sprawę?", scope: "all" },
  onEvent: (frame) => { /* sources | step | reasoning | content | done | error */ },
});
```

Zasady kontraktu: ramki są **addytywne** w `/v1` (ignoruj nieznane typy i pola); strumień
zawsze kończy `done` albo `error` — ucięty strumień traktuj jak błąd (transport robi to za
ciebie). Schematy: `schemas/*.schema.json` (JSON Schema 2020-12) — te same pliki konsumują
testy kontraktowe backendu.
