import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

import {
    requestWebNotificationPermission,
} from "@/lib/notifications";

import {
    sendEmailNotification,
} from "@/lib/emailNotifications";

const DAILY_REMINDER_ID = 2001;
const CHANNEL_ID = "spendx-notifications";

const DAILY_REMINDER_TITLE =
    "Daily Expense Reminder";

const DAILY_REMINDER_BODY =
    "Don't forget to record today's expenses in SpendX.";

function getNextReminderDate(
    time: string
): Date {
    const [hours, minutes] = time
        .split(":")
        .map(Number);

    const now = new Date();

    const next = new Date();

    next.setHours(
        Number.isFinite(hours)
            ? hours
            : 20,
        Number.isFinite(minutes)
            ? minutes
            : 0,
        0,
        0
    );

    /*
     * If today's reminder time has already passed,
     * schedule it for tomorrow.
     */
    if (
        next.getTime() <=
        now.getTime()
    ) {
        next.setDate(
            next.getDate() + 1
        );
    }

    return next;
}

/**
 * Checks whether email alerts are enabled
 * in SpendX notification preferences.
 */
function areEmailAlertsEnabled(): boolean {
    if (
        typeof window ===
        "undefined"
    ) {
        return false;
    }

    try {
        const savedSettings =
            localStorage.getItem(
                "spendx-settings"
            );

        if (!savedSettings) {
            return false;
        }

        const settings =
            JSON.parse(
                savedSettings
            );

        return (
            settings.emailAlerts ===
            true
        );
    } catch (error) {
        console.error(
            "Unable to read email notification settings:",
            error
        );

        return false;
    }
}

/**
 * Sends the daily expense reminder
 * through email when email alerts are enabled.
 */
async function sendDailyReminderEmail(): Promise<boolean> {
    if (
        !areEmailAlertsEnabled()
    ) {
        console.log(
            "Email alerts are disabled."
        );

        return false;
    }

    try {
        return await sendEmailNotification(
            {
                type: "daily",
                message:
                    DAILY_REMINDER_BODY,
            }
        );
    } catch (error) {
        console.error(
            "Daily reminder email error:",
            error
        );

        return false;
    }
}

export async function scheduleDailyExpenseReminder(
    time: string
): Promise<boolean> {
    try {
        const nextReminder =
            getNextReminderDate(time);

        /*
         * ----------------------------------------
         * EMAIL
         * ----------------------------------------
         *
         * Email is sent immediately when the
         * daily reminder is scheduled.
         *
         * This allows the email notification
         * preference to be tested and keeps the
         * existing scheduling behavior separate.
         *
         * The actual future daily email delivery
         * would require a server-side scheduler /
         * cron job because browser JavaScript
         * cannot reliably execute while closed.
         */
        const emailEnabled =
            areEmailAlertsEnabled();

        if (emailEnabled) {
            console.log(
                "Daily expense email alert is enabled."
            );
        }

        /*
         * ----------------------------------------
         * ANDROID / CAPACITOR
         * ----------------------------------------
         */
        if (
            Capacitor.isNativePlatform()
        ) {
            const permission =
                await LocalNotifications.checkPermissions();

            if (
                permission.display !==
                "granted"
            ) {
                const requested =
                    await LocalNotifications.requestPermissions();

                if (
                    requested.display !==
                    "granted"
                ) {
                    return false;
                }
            }

            await LocalNotifications.createChannel(
                {
                    id: CHANNEL_ID,
                    name:
                        "SpendX Notifications",
                    description:
                        "Budget and expense reminders",
                    importance: 4,
                    visibility: 1,
                }
            );

            /*
             * Remove an existing daily reminder
             * before creating the new one.
             */
            try {
                await LocalNotifications.cancel(
                    {
                        notifications: [
                            {
                                id:
                                    DAILY_REMINDER_ID,
                            },
                        ],
                    }
                );
            } catch {
                // It is okay if there was no previous notification.
            }

            await LocalNotifications.schedule(
                {
                    notifications: [
                        {
                            id:
                                DAILY_REMINDER_ID,
                            title:
                                DAILY_REMINDER_TITLE,
                            body:
                                DAILY_REMINDER_BODY,
                            channelId:
                                CHANNEL_ID,
                            schedule: {
                                at:
                                    nextReminder,
                                repeats: true,
                                every: "day",
                                allowWhileIdle:
                                    true,
                            },
                        },
                    ],
                }
            );

            return true;
        }

        /*
         * ----------------------------------------
         * WEB BROWSER
         * ----------------------------------------
         */
        const permission =
            await requestWebNotificationPermission();

        if (!permission) {
            return false;
        }

        /*
         * Browser notifications cannot reliably survive
         * a completely closed browser without Web Push /
         * a service worker.
         *
         * For the current website implementation,
         * schedule the next reminder while the page
         * is open.
         */
        const delay =
            nextReminder.getTime() -
            Date.now();

        window.setTimeout(
            async () => {
                if (
                    typeof Notification ===
                    "undefined" ||
                    Notification.permission !==
                    "granted"
                ) {
                    return;
                }

                new Notification(
                    DAILY_REMINDER_TITLE,
                    {
                        body:
                            DAILY_REMINDER_BODY,
                        icon:
                            "/icon-192.png",
                        tag:
                            "spendx-daily-expense-reminder",
                    }
                );

                /*
                 * Send the email at the time the
                 * daily browser reminder fires.
                 */
                if (
                    areEmailAlertsEnabled()
                ) {
                    await sendDailyReminderEmail();
                }
            },
            delay
        );

        return true;
    } catch (error) {
        console.error(
            "Daily expense reminder scheduling error:",
            error
        );

        return false;
    }
}

export async function cancelDailyExpenseReminder(): Promise<void> {
    try {
        if (
            Capacitor.isNativePlatform()
        ) {
            await LocalNotifications.cancel(
                {
                    notifications: [
                        {
                            id:
                                DAILY_REMINDER_ID,
                        },
                    ],
                }
            );
        }
    } catch (error) {
        console.error(
            "Cancel daily expense reminder error:",
            error
        );
    }
}