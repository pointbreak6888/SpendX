import type { ChatPeriod } from "./parser";

export function detectPeriod(question: string): ChatPeriod {
    const text = question.toLowerCase();

    if (text.includes("yesterday")) {
        return "YESTERDAY";
    }

    if (text.includes("last week")) {
        return "LAST_WEEK";
    }

    if (text.includes("this week")) {
        return "THIS_WEEK";
    }

    if (text.includes("last month")) {
        return "LAST_MONTH";
    }

    if (text.includes("this month")) {
        return "THIS_MONTH";
    }

    if (text.includes("this year")) {
        return "THIS_YEAR";
    }

    if (text.includes("last 7 days")) {
        return "LAST_7_DAYS";
    }

    if (text.includes("last 30 days")) {
        return "LAST_30_DAYS";
    }

    if (text.includes("today")) {
        return "TODAY";
    }

    return "ALL_TIME";
}