import type { InsightResult } from "./insights";

function formatAmount(amount: number) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
    }).format(amount);
}

function periodLabel(
    period: InsightResult["period"]
) {
    switch (period) {
        case "TODAY":
            return "today";

        case "YESTERDAY":
            return "yesterday";

        case "THIS_WEEK":
            return "this week";

        case "LAST_WEEK":
            return "last week";

        case "THIS_MONTH":
            return "this month";

        case "LAST_MONTH":
            return "last month";

        case "THIS_YEAR":
            return "this year";

        case "LAST_7_DAYS":
            return "the last 7 days";

        case "LAST_30_DAYS":
            return "the last 30 days";

        case "ALL_TIME":
        default:
            return "all time";
    }
}

function formatDate(date: string) {
    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
        return date;
    }

    return parsed.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

export function generateResponse(
    result: InsightResult
): string {
    const period = periodLabel(result.period);

    switch (result.intent) {
        case "TOTAL_SPENDING": {
            const total = result.total ?? 0;

            if (result.transactionCount === 0) {
                return `I couldn't find any expenses ${period}.`;
            }

            if (result.category) {
                return `You spent ${formatAmount(
                    total
                )} on ${result.category} ${period}.`;
            }

            return `You spent ${formatAmount(
                total
            )} ${period}.`;
        }

        case "CATEGORY_SPENDING": {
            const total = result.total ?? 0;

            if (result.transactionCount === 0) {
                return result.category
                    ? `I couldn't find any ${result.category} expenses ${period}.`
                    : `I couldn't find any expenses ${period}.`;
            }

            return `You spent ${formatAmount(
                total
            )} on ${result.category ?? "this category"} ${period}.`;
        }

        case "TOP_CATEGORY": {
            if (!result.topCategory) {
                return `I couldn't find any expenses ${period}.`;
            }

            return `You spent the most on ${result.topCategory.category}, with ${formatAmount(
                result.topCategory.amount
            )} ${period}.`;
        }

        case "TOP_CATEGORIES": {
            if (
                !result.topCategories ||
                result.topCategories.length === 0
            ) {
                return `I couldn't find any expenses ${period}.`;
            }

            const lines = result.topCategories.map(
                (item, index) =>
                    `${index + 1}. ${item.category} — ${formatAmount(
                        item.amount
                    )}`
            );

            return `Here are your top spending categories ${period}:\n${lines.join(
                "\n"
            )}`;
        }

        case "BIGGEST_EXPENSE": {
            if (!result.biggestExpense) {
                return `I couldn't find any expenses ${period}.`;
            }

            const expense = result.biggestExpense;

            return `Your biggest expense ${period} was ${formatAmount(
                expense.amount
            )} for ${expense.category} on ${formatDate(
                expense.date
            )}.`;
        }

        case "TOTAL_INCOME": {
            const total = result.total ?? 0;

            if (result.transactionCount === 0) {
                return `I couldn't find any income ${period}.`;
            }

            return `You received ${formatAmount(
                total
            )} in income ${period}.`;
        }

        case "SAVINGS": {
            const total = result.total ?? 0;

            if (total > 0) {
                return `You saved ${formatAmount(
                    total
                )} ${period}.`;
            }

            if (total < 0) {
                return `Your expenses exceeded your income by ${formatAmount(
                    Math.abs(total)
                )} ${period}.`;
            }

            return `Your income and expenses were equal ${period}.`;
        }

        case "RECENT_TRANSACTIONS": {
            if (
                !result.recentTransactions ||
                result.recentTransactions.length === 0
            ) {
                return `I couldn't find any transactions ${period}.`;
            }

            const lines = result.recentTransactions.map(
                (transaction) => {
                    const sign =
                        transaction.type === "income"
                            ? "+"
                            : "-";

                    return `${sign}${formatAmount(
                        transaction.amount
                    )} — ${transaction.category} — ${formatDate(
                        transaction.date
                    )}`;
                }
            );

            return `Here are your recent transactions ${period}:\n${lines.join(
                "\n"
            )}`;
        }

        case "AVERAGE_SPENDING": {
            const average = result.average ?? 0;

            if (!result.transactionCount) {
                return `I couldn't calculate your average spending because there are no expenses ${period}.`;
            }

            return `Your average expense ${period} is ${formatAmount(
                average
            )} per transaction.`;
        }

        case "COMPARE_PERIODS": {
            if (!result.comparison) {
                return "I couldn't calculate that comparison yet.";
            }

            const {
                current,
                previous,
                difference,
                percentage,
            } = result.comparison;

            if (difference > 0) {
                return `You spent ${formatAmount(
                    current
                )} compared with ${formatAmount(
                    previous
                )} in the previous period. That's an increase of ${formatAmount(
                    difference
                )} (${percentage.toFixed(1)}%).`;
            }

            if (difference < 0) {
                return `You spent ${formatAmount(
                    current
                )} compared with ${formatAmount(
                    previous
                )} in the previous period. That's a decrease of ${formatAmount(
                    Math.abs(difference)
                )} (${Math.abs(percentage).toFixed(1)}%).`;
            }

            return `Your spending was the same in both periods at ${formatAmount(
                current
            )}.`;
        }

        case "UNKNOWN":
        default:
            return "I can help you with your spending, income, savings, categories, and transactions. Try asking something like \"How much did I spend this month?\"";
    }
}