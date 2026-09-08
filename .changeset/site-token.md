---
"@comtegra/docs-chat-client": minor
"@comtegra/docusaurus-theme-docs-chat": minor
---

Token strony dla dokumentacji niepublicznej: `streamDocsChat` przyjmuje `headers`, paczka eksportuje `SITE_TOKEN_HEADER` i `DocsChatRequestError` (ze statusem HTTP), reducer zna notice `unauthorized`; theme dostaje opcję `siteToken` (nagłówek `X-Site-Token` w czacie i feedbacku, osobny komunikat przy 401/403). Schemat statusu: pole `auth.siteToken`.
