const countryCurrencies: Record<string, string> = {
  BR: "BRL",
  ES: "EUR",
  NL: "EUR",
  PT: "EUR",
  FR: "EUR",
  IT: "EUR",
  US: "USD",
  GB: "GBP",
};

export function getCurrencyForCountry(countryCode?: string | null) {
  if (!countryCode) return null;
  return countryCurrencies[countryCode.trim().toUpperCase()] ?? null;
}

export function formatCurrency(amount: number, currency?: string | null) {
  if (!currency) return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(amount);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
