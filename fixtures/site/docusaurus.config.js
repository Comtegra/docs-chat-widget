// Strona-fixture: minimalny konsument @comtegra/docusaurus-theme-docs-chat — smoke build w CI.
// Matrix przez env: FIXTURE_FASTER=true → bundler rspack (@docusaurus/faster),
// FIXTURE_V4=false → wyłącza future.v4 (wariant "stary" Docusaurus 3).
const useFaster = process.env.FIXTURE_FASTER === "true";
const useV4 = process.env.FIXTURE_V4 !== "false";

module.exports = {
  title: "Docs Chat Fixture",
  url: "https://fixture.invalid",
  baseUrl: "/",
  i18n: { defaultLocale: "pl", locales: ["pl"] },
  future: {
    v4: useV4,
    faster: useFaster,
  },
  onBrokenLinks: "throw",
  markdown: { hooks: { onBrokenMarkdownLinks: "throw" } },
  presets: [
    [
      "classic",
      {
        docs: { routeBasePath: "/", sidebarPath: require.resolve("./sidebars.js") },
        blog: false,
        theme: { customCss: require.resolve("./src/css/custom.css") },
      },
    ],
  ],
  themes: [
    [
      "@comtegra/docusaurus-theme-docs-chat",
      {
        apiBaseUrl: "https://ask.example.com",
        tenant: "ezd",
        assistantName: "e-Doradca",
        examplePrompts: ["Jak założyć sprawę?", "Jak dodać załącznik?"],
        clientIdQueryParam: "r",
      },
    ],
  ],
  themeConfig: {
    navbar: {
      title: "Fixture",
      items: [{ type: "custom-docsChat", position: "right" }],
    },
  },
};
