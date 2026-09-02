// Lifecycle theme'u Docusaurusa (CommonJS — ładowany przez Node przy czytaniu konfiguracji;
// komponenty w src/DocsChat i src/theme to ESM/JSX transpilowane przez bundler strony).
// Wzorzec: @docusaurus/theme-live-codeblock.
//
// Co robi:
// - getThemePath: dostarcza theme/Layout (wrap @theme-init/Layout — strona nic nie swizzluje)
//   i theme/NavbarItem/ComponentTypes (typ `custom-docsChat` → slot przycisku w navbarze);
// - validateOptions: opcje z docusaurus.config (themes: [["@comtegra/docusaurus-theme-docs-chat", {…}]]);
// - contentLoaded/setGlobalData: opcje publiczne dla komponentów (usePluginData);
// - injectHtmlTags: skrypt PRZED hydratacją — (1) przywraca tryb szuflady na <html> (bez
//   „odjeżdżania" treści po przeładowaniu), (2) utrwala id wdrożenia z parametru URL
//   (np. ?r=…) w sessionStorage (nawigacja SPA gubi query string);
// - getClientModules: globalny CSS (tokeny zmapowane na Infima, dosuwanie treści, druk);
// - getDefaultCodeTranslationMessages: tłumaczenia dostarczane przez paczkę (locales/<locale>.json)
//   — strona nie musi dotykać swojego code.json.

const fs = require("node:fs");
const path = require("node:path");
const { Joi } = require("@docusaurus/utils-validation");

const optionsSchema = Joi.object({
  // origin API docs-chat, bez ścieżki (np. https://ask.comtegra.cloud)
  apiBaseUrl: Joi.string()
    .uri({ scheme: ["http", "https"] })
    .required(),
  // id tenanta w API (/api/v1/<tenant>/…)
  tenant: Joi.string()
    .pattern(/^[a-z0-9][a-z0-9-]{1,31}$/)
    .required(),
  // nazwa asystenta: tytuł panelu i przycisk w navbarze (mianownik, np. "e-Doradca")
  assistantName: Joi.string().max(60).required(),
  // 3 podpowiedzi w pustym panelu (mniej/więcej też zadziała)
  examplePrompts: Joi.array().items(Joi.string().max(200)).max(5).default([]),
  // wyłącznik całego widgetu (build-time; np. wariant artefaktu bez asystenta)
  enabled: Joi.boolean().default(true),
  // pasek „Zapytaj o to" nad zaznaczeniem tekstu
  selectionActions: Joi.boolean().default(true),
  // parametr URL z id wdrożenia (atrybucja per instalacja, np. "r"); null = wyłączone
  clientIdQueryParam: Joi.string().max(32).allow(null).default(null),
  // sonda GET /status przy pierwszym otwarciu panelu (komunikat dla sieci z allowlistą)
  statusProbe: Joi.boolean().default(true),
});

/** klucze sessionStorage per tenant (dwa buildy na jednym originie nie kolidują) */
function storageKeys(tenant) {
  return {
    snapshot: `docs-chat:${tenant}:v2`,
    clientId: `docs-chat:${tenant}:client`,
  };
}

module.exports = function themeDocsChat(context, options) {
  const keys = storageKeys(options.tenant);
  const publicOptions = {
    apiBaseUrl: options.apiBaseUrl.replace(/\/+$/, ""),
    tenant: options.tenant,
    assistantName: options.assistantName,
    examplePrompts: options.examplePrompts,
    enabled: options.enabled,
    selectionActions: options.selectionActions,
    statusProbe: options.statusProbe,
    storageKeys: keys,
  };

  return {
    name: "docusaurus-theme-docs-chat",

    getThemePath() {
      return path.resolve(__dirname, "./theme");
    },

    getClientModules() {
      return [path.resolve(__dirname, "./global.css")];
    },

    contentLoaded({ actions }) {
      actions.setGlobalData(publicOptions);
    },

    getDefaultCodeTranslationMessages() {
      const locale = context.i18n.currentLocale;
      const file = path.resolve(__dirname, `../locales/${locale}.json`);
      if (fs.existsSync(file)) {
        return JSON.parse(fs.readFileSync(file, "utf8"));
      }
      return {}; // brak pliku = angielskie defaulty z i18n.js (translate())
    },

    injectHtmlTags() {
      if (!options.enabled) {
        return {};
      }
      const captureClientId = options.clientIdQueryParam
        ? `var p=new URLSearchParams(location.search).get(${JSON.stringify(options.clientIdQueryParam)});` +
          `if(p&&/^[\\x21-\\x7e]{1,128}$/.test(p)){sessionStorage.setItem(${JSON.stringify(keys.clientId)},p);}`
        : "";
      return {
        headTags: [
          {
            tagName: "script",
            attributes: {},
            innerHTML:
              `(function(){try{var s=JSON.parse(sessionStorage.getItem(${JSON.stringify(keys.snapshot)})||'null');` +
              `var m=s&&s.panelMode;if(m==='expanded'||m==='fullscreen'){document.documentElement.setAttribute('data-docs-chat',m);}` +
              captureClientId +
              `}catch(e){}})();`,
          },
        ],
      };
    },
  };
};

module.exports.validateOptions = function validateOptions({ options, validate }) {
  return validate(optionsSchema, options);
};
