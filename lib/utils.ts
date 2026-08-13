export const cn = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(" ");
export const formatCurrency = (amount: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(amount);
