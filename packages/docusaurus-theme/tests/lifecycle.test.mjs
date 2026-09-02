// Lifecycle theme'u (src/index.js, CJS): walidacja opcji, skrypt pre-hydracyjny (zgodność trybów
// z PANEL_MODES i escapowanie), globalne opcje, tłumaczenia z locales/.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { Joi } from "@docusaurus/utils-validation";

import { PANEL_MODES } from "../src/DocsChat/lib/preferences.mjs";

const require = createRequire(import.meta.url);
const themeDocsChat = require("../src/index.js");
const { validateOptions } = themeDocsChat;

const validate = (schema, options) => Joi.attempt(options, schema, { convert: true });
const baseOptions = { apiBaseUrl: "https://ask.example.com/", tenant: "ezd", assistantName: "e-Doradca" };

function makeTheme(extra = {}, locale = "pl") {
  const validated = validateOptions({ options: { ...baseOptions, ...extra }, validate });
  return themeDocsChat({ i18n: { currentLocale: locale } }, validated);
}

test("validateOptions: wymagane pola, pattern tenanta i clientIdQueryParam", () => {
  assert.throws(() => validateOptions({ options: { tenant: "ezd" }, validate }));
  assert.throws(() => validateOptions({ options: { ...baseOptions, tenant: "EZD" }, validate }));
  assert.throws(() => validateOptions({ options: { ...baseOptions, clientIdQueryParam: "</script>" }, validate }));
  const ok = validateOptions({ options: { ...baseOptions, clientIdQueryParam: "r" }, validate });
  assert.equal(ok.clientIdQueryParam, "r");
  assert.equal(ok.statusProbe, true);
  assert.deepEqual(ok.examplePrompts, []);
});

test("setGlobalData: klucze storage per tenant, apiBaseUrl bez końcowego slasha", () => {
  let captured = null;
  makeTheme().contentLoaded({ actions: { setGlobalData: (data) => (captured = data) } });
  assert.equal(captured.apiBaseUrl, "https://ask.example.com");
  assert.deepEqual(captured.storageKeys, { snapshot: "docs-chat:ezd:v2", clientId: "docs-chat:ezd:client" });
  assert.equal(captured.assistantName, "e-Doradca");
});

test("skrypt pre-hydracyjny zna każdy tryb panelu poza collapsed i nie zawiera '</'", () => {
  const { headTags } = makeTheme({ clientIdQueryParam: "r" }).injectHtmlTags();
  const script = headTags[0].innerHTML;
  for (const mode of PANEL_MODES.filter((value) => value !== "collapsed")) {
    assert.ok(script.includes(`'${mode}'`), `skrypt nie zna trybu "${mode}" z PANEL_MODES`);
  }
  assert.ok(script.includes("docs-chat:ezd:v2"));
  assert.ok(script.includes("docs-chat:ezd:client"));
  assert.ok(!script.includes("</"), "sekwencja '</' w inline script może zamknąć tag");
});

test("enabled: false wyłącza headTags", () => {
  assert.deepEqual(makeTheme({ enabled: false }).injectHtmlTags(), {});
});

test("tłumaczenia: pl i fallback pl-PL → pl.json, nieznany locale → {}", () => {
  const pl = makeTheme({}, "pl").getDefaultCodeTranslationMessages();
  const keys = Object.keys(pl);
  assert.ok(keys.length >= 50, `za mało kluczy: ${keys.length}`);
  assert.ok(keys.every((key) => key.startsWith("docsChat.")));
  assert.deepEqual(makeTheme({}, "pl-PL").getDefaultCodeTranslationMessages(), pl);
  assert.deepEqual(makeTheme({}, "de").getDefaultCodeTranslationMessages(), {});
});
