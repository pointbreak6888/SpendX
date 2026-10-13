"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function EmailTestPage() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const sendTestEmail = async () => {
        setLoading(true);
        setMessage("");

        try {
            const {
                data: { session },
                error: sessionError,
            } = await supabase.auth.getSession();

            if (sessionError || !session) {
                setMessage("You are not logged in.");
                return;
            }

            const response = await fetch("/api/email", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    type: "test",
                    message:
                        "This is a test email from SpendX. Your email notification system is working successfully.",
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                setMessage(result.error || "Failed to send email.");
                console.error("Email error:", result);
                return;
            }

            setMessage(
                "Test email sent successfully. Check your email inbox."
            );
        } catch (error) {
            console.error("Test email error:", error);
            setMessage("Something went wrong while sending the email.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px",
            }}
        >
            <div
                style={{
                    width: "100%",
                    maxWidth: "500px",
                    padding: "32px",
                    borderRadius: "16px",
                    background: "#1f1f1f",
                    color: "white",
                }}
            >
                <h1
                    style={{
                        fontSize: "24px",
                        fontWeight: 700,
                    }}
                >
                    SpendX Email Test
                </h1>

                <p
                    style={{
                        marginTop: "10px",
                        color: "#aaa",
                    }}
                >
                    This will send a test email to your SpendX account email.
                </p>

                <button
                    onClick={sendTestEmail}
                    disabled={loading}
                    style={{
                        marginTop: "24px",
                        padding: "12px 20px",
                        borderRadius: "10px",
                        border: "none",
                        background: "#0099ff",
                        color: "white",
                        fontWeight: 600,
                        cursor: loading ? "not-allowed" : "pointer",
                        opacity: loading ? 0.6 : 1,
                    }}
                >
                    {loading ? "Sending..." : "Send Test Email"}
                </button>

                {message && (
                    <p
                        style={{
                            marginTop: "20px",
                            color: "#ccc",
                        }}
                    >
                        {message}
                    </p>
                )}
            </div>
        </main>
    );
}