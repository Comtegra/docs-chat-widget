# Changesets

Wersjonowanie i changelog paczek. Przy zmianie wartej wydania: `npx changeset`
(wybór paczek + semver + opis), plik trafia do PR-a. Po merge'u do `main` bot
otwiera PR "Version Packages"; jego merge publikuje na npm (patrz RELEASING.md).
