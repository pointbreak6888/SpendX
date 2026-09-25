import { detectCategory } from "./categoryParser";
import { detectPeriod } from "./dateParser";

export type ChatIntent =
    | "TOTAL_SPENDING"
    | "CATEGORY_SPENDING"
    | "TOP_CATEGORY"
    | "TOP_CATEGORIES"
    | "BIGGEST_EXPENSE"
    | "TOTAL_INCOME"
    | "SAVINGS"
    | "RECENT_TRANSACTIONS"
    | "AVERAGE_SPENDING"
    | "COMPARE_PERIODS"
    | "UNKNOWN";

export type ChatPeriod =
    | "TODAY"
    | "YESTERDAY"
    | "THIS_WEEK"
    | "LAST_WEEK"
    | "THIS_MONTH"
    | "LAST_MONTH"
    | "THIS_YEAR"
    | "LAST_7_DAYS"
    | "LAST_30_DAYS"
    | "ALL_TIME";

export type ParsedQuestion = {
    intent: ChatIntent;
    period: ChatPeriod;
    category: string | null;
    originalQuestion: string;
};

export function normalizeQuestion(question: string) {
    return question
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ");
}

export function detectIntent(
    question: string
): ChatIntent {
    const text = normalizeQuestion(question);

    if (
        text.includes("biggest expense") ||
        text.includes("largest expense") ||
        text.includes("biggest transaction") ||
        text.includes("largest transaction") ||
        text.includes("most expensive")
    ) {
        return "BIGGEST_EXPENSE";
    }

    if (
        text.includes("where did i spend the most") ||
        text.includes("which category") ||
        text.includes("highest spending category") ||
        text.includes("top spending category")
    ) {
        return "TOP_CATEGORY";
    }

    if (
        text.includes("top categories") ||
        text.includes("highest spending categories") ||
        text.includes("most spent categories")
    ) {
        return "TOP_CATEGORIES";
    }

    if (
        text.includes("how much did i earn") ||
        text.includes("total income") ||
        text.includes("income this") ||
        text.includes("income last")
    ) {
        return "TOTAL_INCOME";
    }

    if (
        text.includes("how much did i save") ||
        text.includes("how much have i saved") ||
        text.includes("my savings")
    ) {
        return "SAVINGS";
    }

    if (
        text.includes("average spending") ||
        text.includes("average expense") ||
        text.includes("average daily spending")
    ) {
        return "AVERAGE_SPENDING";
    }

    if (
        text.includes("compare") ||
        text.includes("compared to") ||
        text.includes("versus") ||
        text.includes("vs")
    ) {
        return "COMPARE_PERIODS";
    }

    if (
        text.includes("recent transactions") ||
        text.includes("recent expenses") ||
        text.includes("latest transactions")
    ) {
        return "RECENT_TRANSACTIONS";
    }

    const category = detectCategory(text);

    if (
        category &&
        (
            text.includes("how much") ||
            text.includes("how much did") ||
            text.includes("spent on") ||
            text.includes("spending on")
        )
    ) {
        return "CATEGORY_SPENDING";
    }

    if (
        text.includes("how much did i spend") ||
        text.includes("how much have i spent") ||
        text.includes("total spending") ||
        text.includes("total expenses") ||
        text.includes("my expenses")
    ) {
        return "TOTAL_SPENDING";
    }

    return "UNKNOWN";
}

export function parseQuestion(
    question: string
): ParsedQuestion {
    const normalized = normalizeQuestion(question);

    return {
        intent: detectIntent(normalized),
        period: detectPeriod(normalized),
        category: detectCategory(normalized),
        originalQuestion: question,
    };
}