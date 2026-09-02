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
npm ci && npm test
npm publish --workspace packages/client --access public
npm publish --workspace packages/docusaurus-theme --access public
```

(`prepublishOnly` buduje IIFE i typy). Zaraz po tym skonfiguruj Trusted Publisher
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
