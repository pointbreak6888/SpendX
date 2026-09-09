import { supabase } from "@/lib/supabase";
import {
    addDays,
    addMonths,
    addWeeks,
    addYears,
    format,
    isAfter,
    isBefore,
    parseISO,
} from "date-fns";

export type RecurringFrequency =
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly";

export type RecurringTransactionInput = {
    amount: number;
    type: "income" | "expense";
    category: string;
    transaction_mode?: string;
    frequency: RecurringFrequency;
    start_date: string;
    end_date?: string | null;
};

export type RecurringTransaction = {
    id: string;
    user_id: string;
    amount: number;
    type: "income" | "expense";
    category: string | null;
    transaction_mode: string | null;
    frequency: RecurringFrequency;
    start_date: string;
    next_occurrence: string;
    end_date: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
};

async function getCurrentUserId() {
    const {
        data: { session },
        error: sessionError,
    } = await supabase.auth.getSession();

    if (session?.user) {
        return session.user.id;
    }

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (user) {
        return user.id;
    }

    if (sessionError || userError) {
        const message = sessionError?.message || userError?.message;

        if (message?.toLowerCase().includes("fetch")) {
            throw new Error(
                "Unable to reach Supabase. Check your connection and try again."
            );
        }
    }

    throw new Error("Please log in again to manage recurring transactions.");
}

function getNextOccurrence(
    currentDate: string,
    frequency: RecurringFrequency
): string {
    const date = parseISO(currentDate);

    switch (frequency) {
        case "daily":
            return format(addDays(date, 1), "yyyy-MM-dd");

        case "weekly":
            return format(addWeeks(date, 1), "yyyy-MM-dd");

        case "monthly":
            return format(addMonths(date, 1), "yyyy-MM-dd");

        case "yearly":
            return format(addYears(date, 1), "yyyy-MM-dd");

        default:
            throw new Error("Invalid recurring transaction frequency.");
    }
}

function validateRecurringInput(transaction: RecurringTransactionInput) {
    if (!Number.isFinite(transaction.amount) || transaction.amount <= 0) {
        throw new Error("Amount must be greater than 0.");
    }

    if (!["income", "expense"].includes(transaction.type)) {
        throw new Error("Invalid transaction type.");
    }

    if (!transaction.category.trim()) {
        throw new Error("Enter a category.");
    }

    if (!["daily", "weekly", "monthly", "yearly"].includes(transaction.frequency)) {
        throw new Error("Invalid recurring frequency.");
    }

    if (!transaction.start_date) {
        throw new Error("Select a start date.");
    }

    if (
        transaction.end_date &&
        isBefore(parseISO(transaction.end_date), parseISO(transaction.start_date))
    ) {
        throw new Error("End date cannot be before the start date.");
    }
}

export async function getRecurringTransactions(): Promise<
    RecurringTransaction[]
> {
    const userId = await getCurrentUserId();

    const { data, error } = await supabase
        .from("recurring_transactions")
        .select("*")
        .eq("user_id", userId)
        .order("next_occurrence", { ascending: true });

    if (error) {
        throw new Error(error.message);
    }

    return (data ?? []) as RecurringTransaction[];
}

export async function addRecurringTransaction(
    transaction: RecurringTransactionInput
) {
    const userId = await getCurrentUserId();

    validateRecurringInput(transaction);

    const { data, error } = await supabase
        .from("recurring_transactions")
        .insert({
            user_id: userId,
            amount: transaction.amount,
            type: transaction.type,
            category: transaction.category.trim(),
            transaction_mode: transaction.transaction_mode ?? "UPI",
            frequency: transaction.frequency,
            start_date: transaction.start_date,
            next_occurrence: transaction.start_date,
            end_date: transaction.end_date ?? null,
            is_active: true,
        })
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return data as RecurringTransaction;
}

export async function updateRecurringTransaction(
    id: string,
    transaction: RecurringTransactionInput
) {
    const userId = await getCurrentUserId();

    validateRecurringInput(transaction);

    const { data, error } = await supabase
        .from("recurring_transactions")
        .update({
            amount: transaction.amount,
            type: transaction.type,
            category: transaction.category.trim(),
            transaction_mode: transaction.transaction_mode ?? "UPI",
            frequency: transaction.frequency,
            start_date: transaction.start_date,
            end_date: transaction.end_date ?? null,
        })
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return data as RecurringTransaction;
}

export async function deleteRecurringTransaction(id: string) {
    const userId = await getCurrentUserId();

    const { error } = await supabase
        .from("recurring_transactions")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

    if (error) {
        throw new Error(error.message);
    }

    return true;
}

export async function toggleRecurringTransaction(
    id: string,
    isActive: boolean
) {
    const userId = await getCurrentUserId();

    const { data, error } = await supabase
        .from("recurring_transactions")
        .update({
            is_active: isActive,
        })
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return data as RecurringTransaction;
}

/**
 * Creates normal transactions for all due recurring transactions.
 *
 * This function is safe to call whenever the transactions page loads.
 * It processes every missed occurrence up to today.
 */
export async function processRecurringTransactions() {
    const userId = await getCurrentUserId();

    const today = format(new Date(), "yyyy-MM-dd");

    const { data: recurringTransactions, error: recurringError } =
        await supabase
            .from("recurring_transactions")
            .select("*")
            .eq("user_id", userId)
            .eq("is_active", true)
            .lte("next_occurrence", today)
            .order("next_occurrence", { ascending: true });

    if (recurringError) {
        throw new Error(recurringError.message);
    }

    if (!recurringTransactions || recurringTransactions.length === 0) {
        return 0;
    }

    let createdCount = 0;

    for (const recurring of recurringTransactions as RecurringTransaction[]) {
        let occurrenceDate = recurring.next_occurrence;

        while (
            occurrenceDate &&
            occurrenceDate <= today &&
            recurring.is_active
        ) {
            // If the recurring transaction has an end date and this occurrence
            // is after that date, deactivate it instead of creating a transaction.
            if (
                recurring.end_date &&
                isAfter(parseISO(occurrenceDate), parseISO(recurring.end_date))
            ) {
                await supabase
                    .from("recurring_transactions")
                    .update({
                        is_active: false,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", recurring.id)
                    .eq("user_id", userId);

                break;
            }

            const { error: transactionError } = await supabase
                .from("transactions")
                .insert({
                    user_id: userId,
                    amount: recurring.amount,
                    type: recurring.type,
                    category: recurring.category,
                    transaction_mode: recurring.transaction_mode ?? "UPI",
                    transaction_date: occurrenceDate,
                });

            if (transactionError) {
                throw new Error(transactionError.message);
            }

            createdCount += 1;

            const nextOccurrence = getNextOccurrence(
                occurrenceDate,
                recurring.frequency
            );

            // If the next occurrence is beyond the end date, deactivate it.
            if (
                recurring.end_date &&
                isAfter(
                    parseISO(nextOccurrence),
                    parseISO(recurring.end_date)
                )
            ) {
                await supabase
                    .from("recurring_transactions")
                    .update({
                        next_occurrence: nextOccurrence,
                        is_active: false,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", recurring.id)
                    .eq("user_id", userId);

                break;
            }

            occurrenceDate = nextOccurrence;

            const { error: updateError } = await supabase
                .from("recurring_transactions")
                .update({
                    next_occurrence: occurrenceDate,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", recurring.id)
                .eq("user_id", userId);

            if (updateError) {
                throw new Error(updateError.message);
            }
        }
    }

    return createdCount;
}