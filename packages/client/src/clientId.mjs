// @ts-check
// Id wdrożenia (`client` w żądaniu czatu): atrybucja per instalacja, NIGDY autoryzacja.
// Jedno źródło wzorca dla: skryptu pre-hydracyjnego theme'u (test pilnuje zgodności literału),
// odczytu z sessionStorage, schematu kontraktu i backendu (cgc-web normalizeClientId).
export const CLIENT_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/** @param {unknown} value */
export function isValidClientId(value) {
  return typeof value === "string" && CLIENT_ID_PATTERN.test(value);
}
