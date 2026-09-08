"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
    const router = useRouter();
    const [error, setError] = useState("");

    useEffect(() => {
        let isMounted = true;

        async function handleAuthCallback() {
            try {
                // Supabase automatically detects the access_token/refresh_token
                // from the URL hash and restores the session in the browser.
                const {
                    data: { session },
                    error: sessionError,
                } = await supabase.auth.getSession();

                if (sessionError) {
                    console.error("OAuth session error:", sessionError);

                    if (isMounted) {
                        setError("Unable to initialize your session.");
                    }

                    return;
                }

                if (session) {
                    router.replace("/dashboard");
                    return;
                }

                // Wait for Supabase to finish processing the OAuth URL.
                const {
                    data: { subscription },
                } = supabase.auth.onAuthStateChange((event, newSession) => {
                    if (
                        (event === "SIGNED_IN" || event === "INITIAL_SESSION") &&
                        newSession
                    ) {
                        router.replace("/dashboard");
                    }
                });

                return () => {
                    subscription.unsubscribe();
                };
            } catch (error) {
                console.error("OAuth callback error:", error);

                if (isMounted) {
                    setError("Something went wrong during Google sign-in.");
                }
            }
        }

        const cleanupPromise = handleAuthCallback();

        return () => {
            isMounted = false;

            cleanupPromise.then((cleanup) => {
                if (typeof cleanup === "function") {
                    cleanup();
                }
            });
        };
    }, [router]);

    if (error) {
        return (
            <main className="min-h-screen bg-[#050816] text-white flex items-center justify-center px-4">
                <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.06] p-8 text-center shadow-2xl backdrop-blur-xl">
                    <h1 className="text-xl font-semibold">Sign-in failed</h1>

                    <p className="mt-3 text-sm text-white/60">
                        {error}
                    </p>

                    <button
                        type="button"
                        onClick={() => router.replace("/login")}
                        className="mt-6 rounded-xl bg-blue-500 px-5 py-3 font-semibold text-white transition hover:bg-blue-600"
                    >
                        Back to Login
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#050816] text-white flex items-center justify-center px-4">
            <div className="flex items-center gap-3 text-white/80">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Completing Google sign-in...</span>
            </div>
        </main>
    );
}