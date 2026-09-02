// @ts-check
// Formatowanie liczb dla UI Ask CGC — jedno miejsce dla licznika czasu (LoadingState) i
// etykiety „Przemyślane w N s" (ThinkingTrace), żeby obie pokazywały ten sam czas tak samo.

/**
 * Sekundy z milisekund: jedna cyfra po przecinku poniżej 10 s („1,2"), potem całe („12").
 * Separator dziesiętny wg locale (pl: przecinek, en: kropka).
 * @param {number} ms
 * @param {string} [locale="en"]
 */
export function formatSeconds(ms, locale = "en") {
  const s = Math.max(0, Number(ms) || 0) / 1000;
  const decimals = s < 10 ? 1 : 0;
  try {
    return new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(s);
  } catch {
    return s.toFixed(decimals);
  }
}
