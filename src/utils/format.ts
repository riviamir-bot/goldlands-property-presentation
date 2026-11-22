const MISSING = "—";

function isPresent(value: number) {
  return Number.isFinite(value) && value > 0;
}

export function formatPrice(value: number) {
  if (!isPresent(value)) return MISSING;

  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number, unit?: string) {
  if (!isPresent(value)) return MISSING;

  return unit ? `${value} ${unit}` : String(value);
}
