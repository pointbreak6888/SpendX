import { getTransactions } from "@/lib/transactions";
import type {
    ChatIntent,
    ChatPeriod,
    ParsedQuestion,
} from "./parser";

type Transaction = {
    id: string;
    user_id: string;
    amount: number | string;
    type: "income" | "expense";
    category: string;
    transaction_mode: string | null;
    transaction_date: string;
    created_at: string;
    updated_at: string;
};

export type InsightResult = {
    intent: ChatIntent;
    period: ChatPeriod;
    category: string | null;
    total?: number;
    transactionCount?: number;
    topCategory?: {
        category: string;
        amount: number;
    };
    topCategories?: Array<{
        category: string;
        amount: number;
    }>;
    biggestExpense?: {
        amount: number;
        category: string;
        date: string;
        transactionMode: string | null;
    };
    recentTransactions?: Array<{
        amount: number;
        category: string;
        type: "income" | "expense";
        date: string;
        transactionMode: string | null;
    }>;
    average?: number;
    comparison?: {
        current: number;
        previous: number;
        difference: number;
        percentage: number;
    };
};

function startOfDay(date: Date) {
    const result = new Date(date);

    result.setHours(0, 0, 0, 0);

    return result;
}

function endOfDay(date: Date) {
    const result = new Date(date);

    result.setHours(23, 59, 59, 999);

    return result;
}

function startOfWeek(date: Date) {
    const result = startOfDay(date);

    const day = result.getDay();

    result.setDate(
        result.getDate() - day
    );

    return result;
}

function endOfWeek(date: Date) {
    const result = endOfDay(
        startOfWeek(date)
    );

    result.setDate(
        result.getDate() + 6
    );

    return result;
}

function startOfMonth(date: Date) {
    return new Date(
        date.getFullYear(),
        date.getMonth(),
        1,
        0,
        0,
        0,
        0
    );
}

function endOfMonth(date: Date) {
    return new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
    );
}

function startOfYear(date: Date) {
    return new Date(
        date.getFullYear(),
        0,
        1,
        0,
        0,
        0,
        0
    );
}

function endOfYear(date: Date) {
    return new Date(
        date.getFullYear(),
        11,
        31,
        23,
        59,
        59,
        999
    );
}

function getPeriodRange(
    period: ChatPeriod,
    referenceDate = new Date()
) {
    const today = startOfDay(referenceDate);

    switch (period) {
        case "TODAY":
            return {
                start: startOfDay(today),
                end: endOfDay(today),
            };

        case "YESTERDAY": {
            const yesterday = new Date(today);

            yesterday.setDate(
                yesterday.getDate() - 1
            );

            return {
                start: startOfDay(yesterday),
                end: endOfDay(yesterday),
            };
        }

        case "THIS_WEEK":
            return {
                start: startOfWeek(today),
                end: endOfWeek(today),
            };

        case "LAST_WEEK": {
            const start = startOfWeek(today);

            start.setDate(
                start.getDate() - 7
            );

            const end = endOfWeek(start);

            return {
                start,
                end,
            };
        }

        case "THIS_MONTH":
            return {
                start: startOfMonth(today),
                end: endOfMonth(today),
            };

        case "LAST_MONTH": {
            const lastMonth = new Date(
                today.getFullYear(),
                today.getMonth() - 1,
                1
            );

            return {
                start: startOfMonth(lastMonth),
                end: endOfMonth(lastMonth),
            };
        }

        case "THIS_YEAR":
            return {
                start: startOfYear(today),
                end: endOfYear(today),
            };

        case "LAST_7_DAYS": {
            const start = new Date(today);

            start.setDate(
                start.getDate() - 6
            );

            return {
                start: startOfDay(start),
                end: endOfDay(today),
            };
        }

        case "LAST_30_DAYS": {
            const start = new Date(today);

            start.setDate(
                start.getDate() - 29
            );

            return {
                start: startOfDay(start),
                end: endOfDay(today),
            };
        }

        case "ALL_TIME":
        default:
            return null;
    }
}

function transactionDate(
    transaction: Transaction
) {
    const date = new Date(
        transaction.transaction_date
    );

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
}

function filterByPeriod(
    transactions: Transaction[],
    period: ChatPeriod
) {
    const range = getPeriodRange(period);

    if (!range) {
        return transactions;
    }

    return transactions.filter(
        (transaction) => {
            const date =
                transactionDate(transaction);

            if (!date) {
                return false;
            }

            return (
                date >= range.start &&
                date <= range.end
            );
        }
    );
}

function getExpenses(
    transactions: Transaction[]
) {
    return transactions.filter(
        (transaction) =>
            transaction.type === "expense"
    );
}

function getIncome(
    transactions: Transaction[]
) {
    return transactions.filter(
        (transaction) =>
            transaction.type === "income"
    );
}

function sumTransactions(
    transactions: Transaction[]
) {
    return transactions.reduce(
        (total, transaction) =>
            total +
            Number(transaction.amount),
        0
    );
}

function roundAmount(amount: number) {
    return Number(amount.toFixed(2));
}

function getCategoryTotals(
    transactions: Transaction[]
) {
    const totals: Record<string, number> = {};

    for (const transaction of transactions) {
        const category =
            transaction.category?.trim() ||
            "Other";

        totals[category] =
            (totals[category] || 0) +
            Number(transaction.amount);
    }

    return Object.entries(totals)
        .map(([category, amount]) => ({
            category,
            amount: roundAmount(amount),
        }))
        .sort(
            (a, b) =>
                b.amount - a.amount
        );
}

export async function calculateInsight(
    question: ParsedQuestion
): Promise<InsightResult> {
    const data =
        await getTransactions();

    const transactions =
        data as Transaction[];

    const periodTransactions =
        filterByPeriod(
            transactions,
            question.period
        );

    const expenses =
        getExpenses(
            periodTransactions
        );

    const income =
        getIncome(
            periodTransactions
        );

    switch (question.intent) {
        case "TOTAL_SPENDING": {
            let relevant = expenses;

            if (question.category) {
                relevant = expenses.filter(
                    (transaction) =>
                        transaction.category
                            .toLowerCase()
                            .trim() ===
                        question.category
                            ?.toLowerCase()
                            .trim()
                );
            }

            return {
                intent: question.intent,
                period: question.period,
                category:
                    question.category,
                total: roundAmount(
                    sumTransactions(
                        relevant
                    )
                ),
                transactionCount:
                    relevant.length,
            };
        }

        case "CATEGORY_SPENDING": {
            const category =
                question.category;

            const relevant =
                category
                    ? expenses.filter(
                        (transaction) =>
                            transaction.category
                                .toLowerCase()
                                .trim() ===
                            category
                                .toLowerCase()
                                .trim()
                    )
                    : expenses;

            return {
                intent: question.intent,
                period: question.period,
                category,
                total: roundAmount(
                    sumTransactions(
                        relevant
                    )
                ),
                transactionCount:
                    relevant.length,
            };
        }

        case "TOP_CATEGORY": {
            const categoryTotals =
                getCategoryTotals(
                    expenses
                );

            return {
                intent: question.intent,
                period: question.period,
                category: null,
                topCategory:
                    categoryTotals[0],
            };
        }

        case "TOP_CATEGORIES": {
            const categoryTotals =
                getCategoryTotals(
                    expenses
                );

            return {
                intent: question.intent,
                period: question.period,
                category: null,
                topCategories:
                    categoryTotals.slice(
                        0,
                        5
                    ),
            };
        }

        case "BIGGEST_EXPENSE": {
            const biggest =
                [...expenses].sort(
                    (a, b) =>
                        Number(
                            b.amount
                        ) -
                        Number(
                            a.amount
                        )
                )[0];

            return {
                intent: question.intent,
                period: question.period,
                category: null,
                biggestExpense:
                    biggest
                        ? {
                            amount: roundAmount(
                                Number(
                                    biggest.amount
                                )
                            ),
                            category:
                                biggest.category ||
                                "Other",
                            date:
                                biggest.transaction_date,
                            transactionMode:
                                biggest.transaction_mode,
                        }
                        : undefined,
            };
        }

        case "TOTAL_INCOME": {
            return {
                intent: question.intent,
                period: question.period,
                category: null,
                total: roundAmount(
                    sumTransactions(
                        income
                    )
                ),
                transactionCount:
                    income.length,
            };
        }

        case "SAVINGS": {
            const totalIncome =
                sumTransactions(
                    income
                );

            const totalExpenses =
                sumTransactions(
                    expenses
                );

            return {
                intent: question.intent,
                period: question.period,
                category: null,
                total: roundAmount(
                    totalIncome -
                    totalExpenses
                ),
                transactionCount:
                    periodTransactions.length,
            };
        }

        case "RECENT_TRANSACTIONS": {
            const recent =
                [...periodTransactions]
                    .sort(
                        (a, b) =>
                            new Date(
                                b.transaction_date
                            ).getTime() -
                            new Date(
                                a.transaction_date
                            ).getTime()
                    )
                    .slice(0, 5);

            return {
                intent: question.intent,
                period: question.period,
                category: null,
                recentTransactions:
                    recent.map(
                        (
                            transaction
                        ) => ({
                            amount:
                                roundAmount(
                                    Number(
                                        transaction.amount
                                    )
                                ),
                            category:
                                transaction.category ||
                                "Other",
                            type:
                                transaction.type,
                            date:
                                transaction.transaction_date,
                            transactionMode:
                                transaction.transaction_mode,
                        })
                    ),
            };
        }

        case "AVERAGE_SPENDING": {
            if (expenses.length === 0) {
                return {
                    intent:
                        question.intent,
                    period:
                        question.period,
                    category: null,
                    average: 0,
                };
            }

            const total =
                sumTransactions(
                    expenses
                );

            const average =
                total /
                expenses.length;

            return {
                intent: question.intent,
                period: question.period,
                category: null,
                average:
                    roundAmount(
                        average
                    ),
                transactionCount:
                    expenses.length,
            };
        }

        case "COMPARE_PERIODS": {
            const currentPeriod =
                question.period ===
                    "LAST_MONTH"
                    ? "LAST_MONTH"
                    : "THIS_MONTH";

            const currentRange =
                getPeriodRange(
                    currentPeriod
                );

            let previousPeriod:
                | ChatPeriod
                | null = null;

            if (
                currentPeriod ===
                "THIS_MONTH"
            ) {
                previousPeriod =
                    "LAST_MONTH";
            }

            if (
                !currentRange ||
                !previousPeriod
            ) {
                return {
                    intent:
                        question.intent,
                    period:
                        question.period,
                    category: null,
                    comparison: {
                        current: 0,
                        previous: 0,
                        difference: 0,
                        percentage: 0,
                    },
                };
            }

            const currentTransactions =
                filterByPeriod(
                    transactions,
                    currentPeriod
                );

            const previousTransactions =
                filterByPeriod(
                    transactions,
                    previousPeriod
                );

            const currentTotal =
                sumTransactions(
                    getExpenses(
                        currentTransactions
                    )
                );

            const previousTotal =
                sumTransactions(
                    getExpenses(
                        previousTransactions
                    )
                );

            const difference =
                currentTotal -
                previousTotal;

            const percentage =
                previousTotal === 0
                    ? 0
                    : (difference /
                        previousTotal) *
                    100;

            return {
                intent:
                    question.intent,
                period:
                    question.period,
                category: null,
                comparison: {
                    current:
                        roundAmount(
                            currentTotal
                        ),
                    previous:
                        roundAmount(
                            previousTotal
                        ),
                    difference:
                        roundAmount(
                            difference
                        ),
                    percentage:
                        roundAmount(
                            percentage
                        ),
                },
            };
        }

        case "UNKNOWN":
        default:
            return {
                intent: "UNKNOWN",
                period:
                    question.period,
                category:
                    question.category,
            };
    }
}