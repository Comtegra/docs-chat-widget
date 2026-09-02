# Wydawanie paczek

Publikacja jest automatyczna (changesets + GitHub Actions + npm Trusted Publishing —
bez tokenów npm w sekretach repo).

## Jednorazowa konfiguracja (org `comtegra` na npmjs.com)

1. Załóż/urzyj organizację `comtegra`; nadaj dostęp maintainerom.
2. Po pierwszej, RĘCZNEJ publikacji (sekcja niżej) skonfiguruj **Trusted Publisher** dla
   `@comtegra/docs-chat-client` i `@comtegra/docusaurus-theme-docs-chat`:
   Settings → Publishing access → GitHub Actions:
   - repository: `Comtegra/docs-chat-widget`
   - workflow: `.github/workflows/release.yml`
   - environment: (puste)
3. W ustawieniach paczek wymuś publikację wyłącznie przez Trusted Publisher
   (require two-factor / disallow tokens), gdy już działa.

## Pierwsze wydanie (bootstrap)

npm pozwala skonfigurować Trusted Publisher dopiero dla paczki, która już istnieje
w rejestrze — pierwszej publikacji workflow NIE wykona (401). Robi ją ręcznie
maintainer z dostępem do orga, z czystego checkoutu `main`:

```bash
npm login                       # konto z dostępem do orga; OTP przy 2FA
npm ci && npm test
npm publish --workspace packages/client --access public --provenance=false
npm publish --workspace packages/docusaurus-theme --access public --provenance=false
```

(`prepublishOnly` buduje IIFE i typy). `--provenance=false` jest konieczne: paczki mają
`publishConfig.provenance: true`, a atestacja provenance działa wyłącznie w CI z OIDC
(GitHub Actions/GitLab) — lokalny publish bez tej flagi kończy się błędem sigstore. Zaraz po tym skonfiguruj Trusted Publisher
(punkt 2 wyżej) — kolejne wydania idą już wyłącznie przez workflow.

## Cykl wydania

1. W PR ze zmianą wartą wydania: `npx changeset` → wybierz paczki, semver, opis.
2. Merge do `main` → bot changesets otwiera PR **"Version Packages"**
   (podbicia wersji + CHANGELOG).
3. Merge tego PR-a → workflow `release.yml` publikuje na npm z provenance
   (`prepublishOnly` buduje IIFE i typy) i tworzy GitHub Release.

> Ograniczenie GitHuba: PR "Version Packages" tworzony przez `GITHUB_TOKEN` nie
> uruchamia workflowów `pull_request` — bramką testową przed publikacją jest
> `npm test` w samym `release.yml`. Jeśli branch protection na `main` wymaga
> zielonych checków, użyj PAT/GitHub App w `changesets/action` albo zamknij
> i otwórz Version PR ręcznie.

Wersje: paczki niezależne; zależność theme→client podbijana automatycznie
(`updateInternalDependencies: patch`). Strona `fixtures/site` jest ignorowana.

## Po wydaniu — weryfikacja

```bash
npm view @comtegra/docs-chat-client version
npm view @comtegra/docusaurus-theme-docs-chat version dependencies
```

Wersje zgodne z Version PR + zależność theme→client podbita. Provenance: zakładka
"Provenance" na stronie paczki (wydania z CI mają atestację; bootstrap jej nie ma — to OK).

## Wycofanie złego wydania

npm nie pozwala nadpisać wersji. Kolejność:

1. Cofnij `latest` na ostatnią dobrą: `npm dist-tag add @comtegra/<paczka>@<dobra> latest`
   — świeże `npm install` przestaje brać felerną natychmiast.
2. Oznacz felerną: `npm deprecate @comtegra/<paczka>@<zła> "użyj <dobra>: <powód>"`.
3. Wydaj poprawkę normalnym cyklem (changeset → Version PR → merge).

`npm unpublish` tylko w ostateczności (okno 72 h, łamie buildy konsumentów z lockfile'em).

## Aktualizacja u konsumentów

- **Podręcznik eZD (theme):** `npm update @comtegra/docusaurus-theme-docs-chat` + commit
  lockfile'a w repo klienta (PR jak każda zmiana zależności). Semver `^` NIE aktualizuje się
  samo przy `npm ci`.
- **Aplikacja EZD (IIFE):** plik `dist/docs-chat-client.iife.min.js` jest wersjonowany razem
  z paczką — klient podmienia plik z nowego tarballa (`npm pack @comtegra/docs-chat-client`
  albo CDN typu jsDelivr z jawną wersją w URL-u).
