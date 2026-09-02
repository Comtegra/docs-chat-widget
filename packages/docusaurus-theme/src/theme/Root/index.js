// Wrap Root (@theme-init/Root = passthrough z theme-fallback @docusaurus/core): jedyny punkt,
// z którego PACZKA theme'u może globalnie zamontować widget. Wrap Layoutu odpada:
// @theme-init/Layout to goły Layout theme-fallback (bez LayoutProvider — SSG pada na
// useScrollController), a @theme-original/Layout z wnętrza własnej warstwy wskazuje na nas
// samych (rekursja). Root dodatkowo nie remontuje się przy nawigacji (facebook/docusaurus#3919)
// — panel i strumień przeżywają przejścia między trasami. Strona-konsument NICZEGO nie
// swizzluje; jej własny wrap Root (gdyby istniał) widzi nasz przez @theme-original.
//
// Kontekst strony = useActiveDocContext(id).activeDoc.path (== permalink z baseUrl);
// backend dopasowuje zakres „ta strona" po metadata.route. Poza docs (search, 404, strony
// własne) permalink = null → działa zakres „Cała dokumentacja".
//
// Własny ErrorBoundary: awaria panelu (np. obca migawka sessionStorage) nie może zastąpić
// całej strony stroną błędu — panel znika, treść zostaje.
import React, { useEffect } from "react";
import Root from "@theme-init/Root";
import ErrorBoundary from "@docusaurus/ErrorBoundary";
import { usePluginData } from "@docusaurus/useGlobalData";
import { useActiveDocContext, useAllDocsData } from "@docusaurus/plugin-content-docs/client";

import DocsChat from "../../DocsChat";

// useActiveDocContext wymaga ISTNIEJĄCEJ instancji docs — strona bez docs (albo z docs pod innym
// id niż "default") nie może wywalać widgetu, więc id bierzemy z useAllDocsData(); bez docs
// w ogóle nie montujemy hooka (permalink=null → działa zakres „Cała dokumentacja")
function DocsChatMount() {
  const options = usePluginData("docusaurus-theme-docs-chat");
  const allDocsData = useAllDocsData();
  const docsPluginId = allDocsData.default ? "default" : Object.keys(allDocsData)[0];
  if (!options || options.enabled === false) {
    return null;
  }
  if (!docsPluginId) {
    return <DocsChat options={options} permalink={null} />;
  }
  return <DocsChatDocsAware options={options} docsPluginId={docsPluginId} />;
}

function DocsChatDocsAware({ options, docsPluginId }) {
  const { activeDoc } = useActiveDocContext(docsPluginId);
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

export default function RootWrapper(props) {
  return (
    <Root {...props}>
      {props.children}
      <ErrorBoundary fallback={docsChatFallback}>
        <DocsChatMount />
      </ErrorBoundary>
    </Root>
  );
}
