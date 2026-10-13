import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

const CHANNEL_ID = "spendx-notifications";

/**
 * Check whether browser notifications are supported.
 */
export function isWebNotificationSupported(): boolean {
    return (
        typeof window !== "undefined" &&
        "Notification" in window
    );
}

/**
 * Get the current browser notification permission.
 */
export function getWebNotificationPermission(): NotificationPermission | null {
    if (!isWebNotificationSupported()) {
        return null;
    }

    return Notification.permission;
}

/**
 * Request browser notification permission.
 */
export async function requestWebNotificationPermission(): Promise<boolean> {
    if (!isWebNotificationSupported()) {
        return false;
    }

    if (Notification.permission === "granted") {
        return true;
    }

    if (Notification.permission === "denied") {
        return false;
    }

    const permission = await Notification.requestPermission();

    return permission === "granted";
}

/**
 * Initialize Android local notifications.
 */
async function initializeNativeNotifications(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
        return false;
    }

    const permission =
        await LocalNotifications.checkPermissions();

    if (permission.display !== "granted") {
        const requested =
            await LocalNotifications.requestPermissions();

        if (requested.display !== "granted") {
            return false;
        }
    }

    await LocalNotifications.createChannel({
        id: CHANNEL_ID,
        name: "SpendX Notifications",
        description: "Budget and expense reminders",
        importance: 4,
        visibility: 1,
    });

    return true;
}

/**
 * Send an immediate system notification.
 *
 * Website:
 * Uses the browser Notification API.
 *
 * Android:
 * Uses Capacitor Local Notifications.
 */
export async function sendNotification(
    title: string,
    body: string,
    id: number
): Promise<boolean> {
    /*
     * Android / Capacitor
     */
    if (Capacitor.isNativePlatform()) {
        const initialized =
            await initializeNativeNotifications();

        if (!initialized) {
            return false;
        }

        await LocalNotifications.schedule({
            notifications: [
                {
                    id,
                    title,
                    body,
                    channelId: CHANNEL_ID,
                    schedule: {
                        at: new Date(Date.now() + 1000),
                        allowWhileIdle: true,
                    },
                },
            ],
        });

        return true;
    }

    /*
     * Website / Browser
     */
    const permission =
        await requestWebNotificationPermission();

    if (!permission) {
        return false;
    }

    new Notification(title, {
        body,
        icon: "/icon-192.png",
        tag: `spendx-${id}`,
    });

    return true;
}

/**
 * Schedule a notification for a future time.
 *
 * Android:
 * Capacitor can schedule it natively.
 *
 * Website:
 * The browser Notification API cannot reliably schedule
 * a notification after the page/browser is closed.
 *
 * While the page is open, setTimeout can be used.
 */
export async function scheduleNotification(
    title: string,
    body: string,
    id: number,
    at: Date
): Promise<boolean> {
    if (at.getTime() <= Date.now()) {
        return false;
    }

    /*
     * Android / Capacitor
     */
    if (Capacitor.isNativePlatform()) {
        const initialized =
            await initializeNativeNotifications();

        if (!initialized) {
            return false;
        }

        await LocalNotifications.schedule({
            notifications: [
                {
                    id,
                    title,
                    body,
                    channelId: CHANNEL_ID,
                    schedule: {
                        at,
                        allowWhileIdle: true,
                    },
                },
            ],
        });

        return true;
    }

    /*
     * Website / Browser
     *
     * This works only while the current page remains open.
     */
    const permission =
        await requestWebNotificationPermission();

    if (!permission) {
        return false;
    }

    const delay = at.getTime() - Date.now();

    window.setTimeout(() => {
        if (Notification.permission !== "granted") {
            return;
        }

        new Notification(title, {
            body,
            icon: "/icon-192.png",
            tag: `spendx-${id}`,
        });
    }, delay);

    return true;
}

/**
 * Cancel a native notification.
 *
 * Browser notifications created with the Notification API
 * cannot be cancelled after creation.
 */
export async function cancelNotification(
    id: number
): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
        return;
    }

    await LocalNotifications.cancel({
        notifications: [{ id }],
    });
}