# @comtegra/docusaurus-theme-docs-chat

Widget asystenta dokumentacji (czat RAG, SSE) jako theme Docusaurusa 3. Instalacja nie
wymaga swizzlowania: theme sam wpina panel przez wrap `Root`, a przycisk w navbarze
przez typ `custom-docsChat`. Protokół i stan rozmowy pochodzą z
[`@comtegra/docs-chat-client`](../client).

## Instalacja

```bash
npm install @comtegra/docusaurus-theme-docs-chat
```

`docusaurus.config.js`:

```js
export default {
  themes: [
    [
      "@comtegra/docusaurus-theme-docs-chat",
      {
        apiBaseUrl: "https://ask.example.com",
        tenant: "ezd",
        assistantName: "e-Doradca",
        examplePrompts: ["Jak założyć sprawę?", "Jak dodać załącznik?"],
      },
    ],
  ],
  navbar: {
    items: [
      // przycisk otwierający panel (pozycja dowolna)
      { type: "custom-docsChat", position: "right" },
    ],
  },
};
```

## Opcje

| Opcja | Typ | Domyślnie | Opis |
| --- | --- | --- | --- |
| `apiBaseUrl` | string (URL) | **wymagane** | Origin API docs-chat, bez ścieżki; widget woła `/api/v1/<tenant>/chat\|feedback\|status`. |
| `tenant` | string | **wymagane** | Id tenanta w API (`^[a-z0-9][a-z0-9-]{1,31}$`). |
| `assistantName` | string | **wymagane** | Nazwa asystenta (mianownik) — tytuł panelu i etykieta przycisku. |
| `examplePrompts` | string[] (≤5) | `[]` | Podpowiedzi startowe w pustym panelu, w języku strony. |
| `enabled` | boolean | `true` | Wyłącznik całego widgetu (build-time). |
| `selectionActions` | boolean | `true` | Pasek „Zapytaj o to” nad zaznaczonym tekstem. |
| `clientIdQueryParam` | string \| null | `null` | Parametr URL z id wdrożenia (np. `"r"` → `?r=urzad-x`); utrwalany w sessionStorage i dołączany do żądań jako `client` (atrybucja per instalacja, nie auth). |
| `statusProbe` | boolean | `true` | Przy pierwszym otwarciu panelu `GET /status` (timeout 3 s); gdy API jest odcięte (sieci z allowlistą), użytkownik dostaje komunikat z adresem do odblokowania zamiast wiecznego spinnera. |

## Tłumaczenia

Teksty idą przez standardowe i18n Docusaurusa (`translate` + `code.json`). Paczka
dostarcza gotowy polski (`locales/pl.json`) przez `getDefaultCodeTranslationMessages` —
strona z `i18n.locales: ["pl"]` nie musi nic robić. Inne języki: `npm run
write-translations` i uzupełnienie kluczy `docsChat.*` we własnym `code.json` (nadpisuje
też nasz polski). W komunikatach placeholder `{assistantName}` jest podstawiany
skonfigurowaną nazwą.

## Wygląd

Kolory i promienie dziedziczą z Infima strony (`--ifm-color-primary`,
`--ifm-global-radius`, …) — widget wygląda „po ichniemu” bez konfiguracji. Nadpisania w
`custom.css` przez tokeny `--ai-*` / `--docs-chat-*` (patrz `src/global.css`). Panel i
przycisk nie trafiają na wydruk.

## Wymagania

Docusaurus `^3.10` z `theme-classic` i `plugin-content-docs`, React 18 lub 19, Node ≥ 20
do builda. Stan rozmowy żyje w `sessionStorage` pod kluczami `docs-chat:<tenant>:*`
(per karta; dwa buildy na jednym originie nie kolidują).
