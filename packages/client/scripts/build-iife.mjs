// Build IIFE dla konsumentów bez bundlera (Angular.js w EZD): jeden plik, global `DocsChatClient`.
// Uruchamiane z katalogu paczki (npm script). Dwa warianty + sourcemapy; syntaktyka es2019
// (target transpiluje składnię, nie API — fetch/ReadableStream/TextDecoder muszą być w przeglądarce).
import { build } from "esbuild";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const shared = {
  entryPoints: ["src/index.mjs"],
  bundle: true,
  format: "iife",
  globalName: "DocsChatClient",
  target: ["es2019"],
  banner: { js: `/*! ${pkg.name} v${pkg.version} — Apache-2.0 */` },
  sourcemap: true,
  logLevel: "info",
};
await build({ ...shared, outfile: "dist/docs-chat-client.iife.js" });
await build({ ...shared, minify: true, outfile: "dist/docs-chat-client.iife.min.js" });
