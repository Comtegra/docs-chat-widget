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

## Token strony (dokumentacja niepubliczna)

Tenant, którego dokumentacja nie jest publiczna, wymaga w czacie i feedbacku nagłówka
`X-Site-Token` (`GET /status` → `auth.siteToken: true`). Token jest wspólny dla całej
strony (wypiekany w build), nie sekretem użytkownika — chroni treść przed skryptami spoza
strony, nie zastępuje limitów. Bez/zły token = HTTP 401 zamiast strumienia; transport rzuca
wtedy `DocsChatRequestError` ze `status`, a reducer zna notice `unauthorized`:

```js
import { streamDocsChat, SITE_TOKEN_HEADER, DocsChatRequestError, noticeForErrorCode } from "@comtegra/docs-chat-client";

try {
  await streamDocsChat({ apiUrl, body, signal, onEvent, headers: { [SITE_TOKEN_HEADER]: token } });
} catch (error) {
  const code = error instanceof DocsChatRequestError && (error.status === 401 || error.status === 403) ? "unauthorized" : "llm_error";
  onEvent({ type: "error", code, at: Date.now() }); // noticeForErrorCode(code) → "unauthorized" | "error"
}
```

## Użycie bez bundlera (np. Angular.js)

Tarball zawiera build IIFE (`dist/docs-chat-client.iife.min.js`) z globalem
`DocsChatClient` — do wpięcia zwykłym `<script>` (plik z paczki albo z CDN typu
jsDelivr/unpkg):

```html
<script src="docs-chat-client.iife.min.js"></script>
<script>
  DocsChatClient.streamDocsChat({
    apiUrl: "https://<host>/api/v1/ezd/chat",
    body: { prompt: pytanie, scope: "all" },
    signal: controller.signal,
    onEvent: function (frame) { /* dispatch po frame.type */ },
  });
</script>
```

Składnia buildu to es2019; `fetch`, `ReadableStream` i `TextDecoder` muszą być dostępne
w przeglądarce (każda współczesna). Typy TypeScript: generowane z JSDoc do `types/`
(w tarballu; pole `types` w package.json).
