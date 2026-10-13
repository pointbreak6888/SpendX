import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const authHeader = request.headers.get("authorization");

        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const accessToken = authHeader.replace("Bearer ", "");

        // Environment variables
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const resendApiKey = process.env.RESEND_API_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
            return NextResponse.json(
                { error: "Supabase environment variables are missing" },
                { status: 500 }
            );
        }

        if (!resendApiKey) {
            return NextResponse.json(
                { error: "RESEND_API_KEY is missing" },
                { status: 500 }
            );
        }

        // Create Supabase client
        const supabase = createClient(
            supabaseUrl,
            supabaseAnonKey
        );

        // Verify logged-in user
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser(accessToken);

        if (userError || !user) {
            return NextResponse.json(
                { error: "Invalid authentication session" },
                { status: 401 }
            );
        }

        if (!user.email) {
            return NextResponse.json(
                { error: "No email address is associated with this account" },
                { status: 400 }
            );
        }

        // Get request data
        const body = await request.json().catch(() => ({}));

        const notificationType = body.type || "test";

        let subject = "SpendX Email Alert";
        let title = "SpendX Email Alerts";
        let message =
            "This is a test email from SpendX. Your email notification system is working successfully.";

        // Budget notification
        if (notificationType === "budget") {
            subject = "SpendX Budget Alert";
            title = "Budget Alert";
            message =
                body.message ||
                "You are approaching or have exceeded your monthly spending limit.";
        }

        // Recurring payment notification
        if (notificationType === "recurring") {
            subject = "SpendX Recurring Payment Reminder";
            title = "Recurring Payment Reminder";
            message =
                body.message ||
                "You have an upcoming recurring payment.";
        }

        // Daily expense reminder
        if (notificationType === "daily") {
            subject = "SpendX Daily Expense Reminder";
            title = "Daily Expense Reminder";
            message =
                body.message ||
                "Don't forget to record today's expenses in SpendX.";
        }

        const fromEmail =
            process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

        // Send email
        const { data, error } = await resend.emails.send({
            from: `SpendX <${fromEmail}>`,
            to: [user.email],
            subject,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8" />
                    <title>${subject}</title>
                </head>

                <body
                    style="
                        margin: 0;
                        padding: 0;
                        background-color: #f4f4f5;
                        font-family: Arial, sans-serif;
                    "
                >
                    <div
                        style="
                            max-width: 600px;
                            margin: 40px auto;
                            background: white;
                            border-radius: 12px;
                            padding: 32px;
                        "
                    >
                        <h1
                            style="
                                margin-top: 0;
                                color: #111827;
                            "
                        >
                            ${title}
                        </h1>

                        <p
                            style="
                                font-size: 16px;
                                line-height: 1.6;
                                color: #374151;
                            "
                        >
                            ${message}
                        </p>

                        <hr
                            style="
                                border: 0;
                                border-top: 1px solid #e5e7eb;
                                margin: 24px 0;
                            "
                        />

                        <p
                            style="
                                font-size: 13px;
                                color: #6b7280;
                            "
                        >
                            This notification was sent by SpendX.
                        </p>
                    </div>
                </body>
                </html>
            `,
        });

        if (error) {
            console.error("Resend error:", error);

            return NextResponse.json(
                {
                    error: "Failed to send email",
                    details: error.message,
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Email sent successfully",
            emailId: data?.id,
            recipient: user.email,
        });
    } catch (error) {
        console.error("Email notification error:", error);

        return NextResponse.json(
            {
                error: "Internal server error",
            },
            { status: 500 }
        );
    }
}