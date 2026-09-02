# Wydawanie paczek

Publikacja jest automatyczna (changesets + GitHub Actions + npm Trusted Publishing —
bez tokenów npm w sekretach repo).

## Jednorazowa konfiguracja (org `comtegra` na npmjs.com)

1. Załóż/urzyj organizację `comtegra`; nadaj dostęp maintainerom.
2. Pierwsza publikacja każdej paczki tworzy ją w rejestrze; od razu potem (albo
   wcześniej, jeśli npm na to pozwala) skonfiguruj **Trusted Publisher** dla
   `@comtegra/docs-chat-client` i `@comtegra/docusaurus-theme-docs-chat`:
   Settings → Publishing access → GitHub Actions:
   - repository: `Comtegra/docs-chat-widget`
   - workflow: `.github/workflows/release.yml`
   - environment: (puste)
3. W ustawieniach paczek wymuś publikację wyłącznie przez Trusted Publisher
   (require two-factor / disallow tokens), gdy już działa.

## Cykl wydania

1. W PR ze zmianą wartą wydania: `npx changeset` → wybierz paczki, semver, opis.
2. Merge do `main` → bot changesets otwiera PR **"Version Packages"**
   (podbicia wersji + CHANGELOG).
3. Merge tego PR-a → workflow `release.yml` publikuje na npm z provenance
   (`prepublishOnly` buduje IIFE i typy) i tworzy GitHub Release.

Wersje: paczki niezależne; zależność theme→client podbijana automatycznie
(`updateInternalDependencies: patch`). Strona `fixtures/site` jest ignorowana.
