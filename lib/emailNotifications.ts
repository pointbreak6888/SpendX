import { supabase } from "@/lib/supabase";

type EmailNotificationType =
    | "budget"
    | "recurring"
    | "daily";

interface EmailNotificationOptions {
    type: EmailNotificationType;
    message: string;
}

function areEmailAlertsEnabled(): boolean {
    if (typeof window === "undefined") {
        return false;
    }

    try {
        const savedSettings = localStorage.getItem("spendx-settings");

        if (!savedSettings) {
            return false;
        }

        const settings = JSON.parse(savedSettings);

        return settings.emailAlerts === true;
    } catch (error) {
        console.error(
            "Unable to read email notification settings:",
            error
        );

        return false;
    }
}

export async function sendEmailNotification(
    options: EmailNotificationOptions
): Promise<boolean> {
    try {
        // Respect the Email Alerts setting.
        if (!areEmailAlertsEnabled()) {
            console.log("Email alerts are disabled.");
            return false;
        }

        const {
            data: { session },
            error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
            console.error(
                "Unable to get authenticated session:",
                sessionError
            );

            return false;
        }

        const response = await fetch("/api/email", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
                type: options.type,
                message: options.message,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            console.error(
                "Email notification failed:",
                result
            );

            return false;
        }

        console.log(
            "Email notification sent:",
            result.emailId
        );

        return true;
    } catch (error) {
        console.error(
            "Email notification error:",
            error
        );

        return false;
    }
}