// Wrap Layout motywu bazowego (@theme-init = komponent pierwszego theme'u, czyli theme-classic;
// wzorzec @docusaurus/theme-live-codeblock): widget montowany RAZ na szczycie drzewa tras,
// wewnątrz providerów motywu — żyje przez całą nawigację SPA, strumienie nie są przerywane.
// Strona-konsument NICZEGO nie swizzluje; jej własny wrap Layout (gdyby istniał) widzi nasz
// przez @theme-original.
//
// Kontekst strony = useActiveDocContext('default').activeDoc.path (== permalink z baseUrl);
// backend dopasowuje zakres „ta strona" po metadata.route. Poza docs (search, 404, strony
// własne) permalink = null → działa zakres „Cała dokumentacja".
//
// Własny ErrorBoundary: awaria panelu (np. obca migawka sessionStorage) nie może zastąpić całej
// strony stroną błędu motywu — panel znika, treść zostaje.
import React, { useEffect } from "react";
import Layout from "@theme-init/Layout";
import ErrorBoundary from "@docusaurus/ErrorBoundary";
import { usePluginData } from "@docusaurus/useGlobalData";
import { useActiveDocContext } from "@docusaurus/plugin-content-docs/client";

import DocsChat from "../../DocsChat";

function DocsChatMount() {
  const options = usePluginData("docusaurus-theme-docs-chat");
  const { activeDoc } = useActiveDocContext("default");
  if (!options || options.enabled === false) {
    return null;
  }
  return <DocsChat options={options} permalink={activeDoc ? activeDoc.path : null} />;
}

// Po awarii panelu: nic nie renderujemy, ale zdejmujemy atrybuty push (globalny CSS odsuwa treść
// po `html[data-docs-chat]`) — w efekcie, nie w renderze (czysty render, StrictMode)
function DocsChatCrashed({ error }) {
  useEffect(() => {
    console.error("Docs chat panel failed; hiding it:", error);
    document.documentElement.removeAttribute("data-docs-chat");
    document.documentElement.removeAttribute("data-docs-chat-ready");
  }, [error]);
  return null;
}
// @docusaurus/ErrorBoundary WYWOŁUJE `fallback(params)` jako zwykłą funkcję w renderze swojego
// komponentu klasowego — hooki muszą więc siedzieć w komponencie zwracanym jako element
const docsChatFallback = ({ error }) => <DocsChatCrashed error={error} />;

export default function LayoutWrapper(props) {
  return (
    <Layout {...props}>
      {props.children}
      <ErrorBoundary fallback={docsChatFallback}>
        <DocsChatMount />
      </ErrorBoundary>
    </Layout>
  );
}
