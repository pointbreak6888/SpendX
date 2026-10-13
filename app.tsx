import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

import Dashboard from "@/app/dashboard/page";
import Transactions from "@/app/transactions/page";
import Reports from "@/app/reports/page";
import Settings from "@/app/settings/page";

import LiquidGlassNavbar from "./components/ui/liquidglassnavbar";
import { sendNotification } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";

function DeepLinkHandler() {
    const navigate = useNavigate();

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) {
            return;
        }

        let listenerHandle:
            | { remove: () => Promise<void> }
            | null = null;

        const handleDeepLink = async (data: { url: string }) => {
            try {
                console.log("SpendX deep link received:", data.url);

                if (!data.url.startsWith("com.spendx.app://auth/callback")) {
                    return;
                }

                const url = new URL(data.url);

                const code = url.searchParams.get("code");
                const next =
                    url.searchParams.get("next") || "/dashboard";

                if (!code) {
                    console.error(
                        "No OAuth authorization code found in deep link."
                    );
                    return;
                }

                const { error } =
                    await supabase.auth.exchangeCodeForSession(code);

                if (error) {
                    console.error(
                        "OAuth code exchange error:",
                        error
                    );
                    return;
                }

                /*
                 * Check whether the user has 2FA enabled.
                 * If required, send them to the verification page.
                 */
                const { data: aalData, error: aalError } =
                    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

                if (
                    !aalError &&
                    aalData &&
                    aalData.nextLevel === "aal2" &&
                    aalData.currentLevel !== "aal2"
                ) {
                    navigate("/auth/verify-2fa");
                    return;
                }

                navigate(next);
            } catch (error) {
                console.error(
                    "Android OAuth deep-link error:",
                    error
                );
            }
        };

        CapacitorApp.addListener("appUrlOpen", handleDeepLink)
            .then((handle) => {
                listenerHandle = handle;
            })
            .catch((error) => {
                console.error(
                    "Failed to register deep-link listener:",
                    error
                );
            });

        return () => {
            if (listenerHandle) {
                listenerHandle.remove();
            }
        };
    }, [navigate]);

    return null;
}

export default function App() {
    useEffect(() => {
        sendNotification(
            "SpendX Notifications",
            "System notifications are working!",
            9999
        );
    }, []);

    return (
        <BrowserRouter>
            <DeepLinkHandler />

            <div className="min-h-screen bg-[#0b1020] text-white pb-32">
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/transactions" element={<Transactions />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/settings" element={<Settings />} />
                </Routes>

                <LiquidGlassNavbar />
            </div>
        </BrowserRouter>
    );
}