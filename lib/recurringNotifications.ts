import { format, isBefore, parseISO } from "date-fns";

import { supabase } from "@/lib/supabase";
import {
    sendNotification,
} from "@/lib/notifications";
import {
    sendEmailNotification,
} from "@/lib/emailNotifications";

type RecurringFrequency =
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly";

type RecurringTransaction = {
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

type ReminderType =
    | "3-day"
    | "1-day"
    | "today";

function getDaysUntilDue(
    nextOccurrence: string
): number {
    const today = parseISO(
        format(new Date(), "yyyy-MM-dd")
    );

    const dueDate = parseISO(
        nextOccurrence
    );

    const difference =
        dueDate.getTime() -
        today.getTime();

    return Math.round(
        difference /
        (1000 * 60 * 60 * 24)
    );
}

function getReminderType(
    daysUntilDue: number
): ReminderType | null {
    if (daysUntilDue === 3) {
        return "3-day";
    }

    if (daysUntilDue === 1) {
        return "1-day";
    }

    if (daysUntilDue === 0) {
        return "today";
    }

    return null;
}

function getNotificationId(
    recurringId: string,
    reminderType: ReminderType
): number {
    /*
     * Create a stable numeric ID from the recurring
     * transaction ID and reminder type.
     *
     * Capacitor local notifications require numeric IDs.
     */
    let hash = 0;

    for (
        let index = 0;
        index < recurringId.length;
        index++
    ) {
        hash =
            (hash * 31 +
                recurringId.charCodeAt(index)) |
            0;
    }

    const baseId =
        Math.abs(hash) % 900000;

    const reminderOffset =
        reminderType === "3-day"
            ? 1
            : reminderType === "1-day"
                ? 2
                : 3;

    return (
        baseId * 10 +
        reminderOffset
    );
}

function getReminderStorageKey(
    recurringId: string,
    nextOccurrence: string,
    reminderType: ReminderType,
    channel: "push" | "email"
) {
    return (
        `spendx-recurring-reminder-` +
        `${recurringId}-` +
        `${nextOccurrence}-` +
        `${reminderType}-` +
        `${channel}`
    );
}

function getCurrencySymbol(
    currency?: string
): string {
    switch (currency) {
        case "USD":
            return "$";

        case "EUR":
            return "€";

        case "GBP":
            return "£";

        case "INR":
        default:
            return "₹";
    }
}

function formatReminderAmount(
    amount: number,
    currency?: string
): string {
    return `${getCurrencySymbol(
        currency
    )}${amount.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

/**
 * Checks active recurring transactions and sends
 * reminders for upcoming recurring payments.
 *
 * Reminder schedule:
 *
 * 3 days before
 * 1 day before
 * On the due date
 *
 * Only expense-type recurring transactions are
 * treated as payment reminders.
 *
 * Push and email notifications are tracked
 * independently.
 */
export async function checkRecurringPaymentNotifications(
    currency?: string
): Promise<void> {
    try {
        /*
         * Read notification preferences.
         */
        const savedSettings =
            localStorage.getItem(
                "spendx-settings"
            );

        if (!savedSettings) {
            return;
        }

        let pushAlertsEnabled = false;
        let emailAlertsEnabled = false;

        try {
            const settings =
                JSON.parse(savedSettings);

            pushAlertsEnabled =
                settings.pushAlerts === true;

            emailAlertsEnabled =
                settings.emailAlerts === true;
        } catch (error) {
            console.error(
                "Could not read SpendX notification settings:",
                error
            );

            return;
        }

        /*
         * If both notification methods are disabled,
         * there is nothing to send.
         */
        if (
            !pushAlertsEnabled &&
            !emailAlertsEnabled
        ) {
            return;
        }

        /*
         * Get the currently authenticated user.
         */
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return;
        }

        /*
         * Get active recurring transactions.
         */
        const {
            data: recurringTransactions,
            error,
        } = await supabase
            .from("recurring_transactions")
            .select("*")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .order(
                "next_occurrence",
                {
                    ascending: true,
                }
            );

        if (error) {
            console.error(
                "Recurring notification query error:",
                error
            );

            return;
        }

        if (
            !recurringTransactions ||
            recurringTransactions.length === 0
        ) {
            return;
        }

        for (
            const recurring of
            recurringTransactions as RecurringTransaction[]
        ) {
            /*
             * Only recurring expenses are payment reminders.
             *
             * Recurring income does not need a
             * "payment due" notification.
             */
            if (
                recurring.type !==
                "expense"
            ) {
                continue;
            }

            if (
                !recurring.next_occurrence
            ) {
                continue;
            }

            /*
             * Respect the recurring transaction
             * end date.
             */
            if (
                recurring.end_date &&
                isBefore(
                    parseISO(
                        recurring.end_date
                    ),
                    parseISO(
                        recurring.next_occurrence
                    )
                )
            ) {
                continue;
            }

            const daysUntilDue =
                getDaysUntilDue(
                    recurring.next_occurrence
                );

            const reminderType =
                getReminderType(
                    daysUntilDue
                );

            /*
             * The payment is not currently inside
             * one of our reminder windows.
             */
            if (!reminderType) {
                continue;
            }

            const amount =
                Number(
                    recurring.amount || 0
                );

            const category =
                recurring.category?.trim() ||
                "Recurring payment";

            const formattedAmount =
                formatReminderAmount(
                    amount,
                    currency
                );

            let title = "";
            let body = "";

            if (
                reminderType ===
                "3-day"
            ) {
                title =
                    "Upcoming Recurring Payment";

                body =
                    `${category} payment of ` +
                    `${formattedAmount} is due in 3 days ` +
                    `(${recurring.next_occurrence}).`;
            }

            if (
                reminderType ===
                "1-day"
            ) {
                title =
                    "Recurring Payment Due Tomorrow";

                body =
                    `${category} payment of ` +
                    `${formattedAmount} is due tomorrow ` +
                    `(${recurring.next_occurrence}).`;
            }

            if (
                reminderType ===
                "today"
            ) {
                title =
                    "Recurring Payment Due Today";

                body =
                    `${category} payment of ` +
                    `${formattedAmount} is due today.`;
            }

            const notificationId =
                getNotificationId(
                    recurring.id,
                    reminderType
                );

            /*
             * ----------------------------------------
             * PUSH NOTIFICATION
             * ----------------------------------------
             */
            if (pushAlertsEnabled) {
                const pushStorageKey =
                    getReminderStorageKey(
                        recurring.id,
                        recurring.next_occurrence,
                        reminderType,
                        "push"
                    );

                const pushAlreadySent =
                    localStorage.getItem(
                        pushStorageKey
                    ) === "sent";

                if (!pushAlreadySent) {
                    try {
                        const sent =
                            await sendNotification(
                                title,
                                body,
                                notificationId
                            );

                        if (sent) {
                            localStorage.setItem(
                                pushStorageKey,
                                "sent"
                            );

                            console.log(
                                "Recurring push notification sent:",
                                recurring.id,
                                reminderType
                            );
                        }
                    } catch (
                    notificationError
                    ) {
                        console.error(
                            "Recurring push notification error:",
                            notificationError
                        );
                    }
                }
            }

            /*
             * ----------------------------------------
             * EMAIL NOTIFICATION
             * ----------------------------------------
             */
            if (emailAlertsEnabled) {
                const emailStorageKey =
                    getReminderStorageKey(
                        recurring.id,
                        recurring.next_occurrence,
                        reminderType,
                        "email"
                    );

                const emailAlreadySent =
                    localStorage.getItem(
                        emailStorageKey
                    ) === "sent";

                if (!emailAlreadySent) {
                    try {
                        const sent =
                            await sendEmailNotification(
                                {
                                    type: "recurring",
                                    message: body,
                                }
                            );

                        if (sent) {
                            localStorage.setItem(
                                emailStorageKey,
                                "sent"
                            );

                            console.log(
                                "Recurring email notification sent:",
                                recurring.id,
                                reminderType
                            );
                        }
                    } catch (
                    emailError
                    ) {
                        console.error(
                            "Recurring email notification error:",
                            emailError
                        );
                    }
                }
            }
        }
    } catch (error) {
        console.error(
            "Recurring payment notification error:",
            error
        );
    }
}