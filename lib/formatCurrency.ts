import type { CurrencyCode } from "./currencies";

export function formatCurrency(
    amount: number,
    currency: CurrencyCode = "INR"
) {
    return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}