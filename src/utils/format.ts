const MISSING = "—";

function isPresent(value: number) {
  return Number.isFinite(value) && value > 0;
}

const PRICE_LOCALES = { he: "he-IL", en: "en-IL", fr: "fr-FR" } as const;

export function formatPrice(value: number, language: keyof typeof PRICE_LOCALES = "he") {
  if (!isPresent(value)) return MISSING;

  return new Intl.NumberFormat(PRICE_LOCALES[language], {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number, unit?: string) {
  if (!isPresent(value)) return MISSING;

  return unit ? `${value} ${unit}` : String(value);
}

const LOCALES = { he: "he-IL", en: "en-GB", fr: "fr-FR" } as const;

/** "September 2027" style date for an ISO date (YYYY-MM-DD); empty input gives an empty string. */
export function formatMonthYear(isoDate: string, language: keyof typeof LOCALES = "he") {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return "";
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat(LOCALES[language], { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}
