"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, LogOut, AlertCircle, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function VerifyTwoFactorPage() {
    const router = useRouter();

    const [factorId, setFactorId] = useState<string | null>(null);
    const [loadingFactor, setLoadingFactor] = useState(true);
    const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
    const [submitting, setSubmitting] = useState(false);
    const [signingOut, setSigningOut] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        let isMounted = true;

        async function initMFA() {
            try {
                // 1. Ensure user has a valid active session
                const {
                    data: { session },
                    error: sessionError,
                } = await supabase.auth.getSession();

                if (sessionError || !session) {
                    if (isMounted) {
                        router.replace("/login");
                    }
                    return;
                }

                // 2. Check current AAL status
                const { data: aalData, error: aalError } =
                    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

                if (aalError) {
                    console.error("AAL check error:", aalError);
                }

                // If already at AAL2, or no MFA is required, redirect to dashboard
                if (aalData?.currentLevel === "aal2" || aalData?.nextLevel !== "aal2") {
                    if (isMounted) {
                        router.replace("/dashboard");
                    }
                    return;
                }

                // 3. Fetch verified TOTP factors
                const { data: factorsData, error: factorsError } =
                    await supabase.auth.mfa.listFactors();

                if (factorsError || !factorsData) {
                    if (isMounted) {
                        setErrorMessage("Failed to load security factors. Please sign in again.");
                        setLoadingFactor(false);
                    }
                    return;
                }

                const verifiedFactor = factorsData.totp?.find(
                    (factor) => factor.status === "verified"
                );

                if (!verifiedFactor) {
                    // No verified factor found, user shouldn't be blocked here
                    if (isMounted) {
                        router.replace("/dashboard");
                    }
                    return;
                }

                if (isMounted) {
                    setFactorId(verifiedFactor.id);
                    setLoadingFactor(false);
                }
            } catch (error) {
                console.error("2FA initialization error:", error);
                if (isMounted) {
                    setErrorMessage("An unexpected error occurred. Please try again.");
                    setLoadingFactor(false);
                }
            }
        }

        void initMFA();

        return () => {
            isMounted = false;
        };
    }, [router]);

    // Automatically focus the first input once loaded
    useEffect(() => {
        if (!loadingFactor && inputRefs.current[0]) {
            inputRefs.current[0]?.focus();
        }
    }, [loadingFactor]);

    const handleDigitChange = (index: number, value: string) => {
        // Handle single character or pasted string
        const cleaned = value.replace(/\D/g, "");

        if (!cleaned) {
            const next = [...digits];
            next[index] = "";
            setDigits(next);
            return;
        }

        if (cleaned.length > 1) {
            // User pasted multi-digit text into this input
            handlePasteData(cleaned);
            return;
        }

        const next = [...digits];
        next[index] = cleaned[0];
        setDigits(next);
        setErrorMessage("");

        // Move to next input if available
        if (index < 5 && cleaned[0]) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !digits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        } else if (e.key === "ArrowLeft" && index > 0) {
            inputRefs.current[index - 1]?.focus();
        } else if (e.key === "ArrowRight" && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pasteData = e.clipboardData.getData("text").replace(/\D/g, "");
        if (pasteData) {
            handlePasteData(pasteData);
        }
    };

    const handlePasteData = (cleaned: string) => {
        const next = [...digits];
        const chars = cleaned.slice(0, 6).split("");

        for (let i = 0; i < 6; i++) {
            next[i] = chars[i] || "";
        }

        setDigits(next);
        setErrorMessage("");

        const nextIndex = Math.min(chars.length, 5);
        inputRefs.current[nextIndex]?.focus();
    };

    const handleVerify = async (e?: React.FormEvent) => {
        if (e) {
            e.preventDefault();
        }

        setErrorMessage("");
        const fullCode = digits.join("").trim();

        if (fullCode.length !== 6 || !/^\d{6}$/.test(fullCode)) {
            setErrorMessage("Please enter all 6 digits from your authenticator app.");
            return;
        }

        if (!factorId) {
            setErrorMessage("Authentication factor not ready. Please refresh or sign in again.");
            return;
        }

        try {
            setSubmitting(true);

            const { error } = await supabase.auth.mfa.challengeAndVerify({
                factorId,
                code: fullCode,
            });

            if (error) {
                console.error("MFA challengeAndVerify error:", error);
                const message = error.message.toLowerCase();
                if (message.includes("invalid") || message.includes("code") || message.includes("expired")) {
                    setErrorMessage("Invalid or expired authenticator code. Please check your app and try again.");
                } else {
                    setErrorMessage(error.message);
                }
                setSubmitting(false);
                return;
            }

            // Success: elevated to AAL2
            router.replace("/dashboard");
        } catch (error) {
            console.error("2FA submission error:", error);
            setErrorMessage("Failed to verify authentication code. Please try again.");
            setSubmitting(false);
        }
    };

    const handleSignOut = async () => {
        try {
            setSigningOut(true);
            await supabase.auth.signOut();
            router.replace("/login");
        } catch (error) {
            console.error("Sign out error:", error);
            router.replace("/login");
        } finally {
            setSigningOut(false);
        }
    };

    if (loadingFactor) {
        return (
            <main className="min-h-screen bg-[#050816] text-white flex items-center justify-center px-4">
                <div className="flex items-center gap-3 text-white/80 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 backdrop-blur-xl">
                    <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
                    <span className="text-sm">Verifying security status...</span>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#050816] text-white flex items-center justify-center px-4 relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/15 blur-[120px]" />
                <div className="absolute right-1/4 bottom-1/4 h-72 w-72 rounded-full bg-blue-600/10 blur-[100px]" />
            </div>

            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur-xl relative z-10">
                <div className="mb-6 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                        <ShieldCheck className="h-7 w-7" />
                    </div>

                    <h1 className="text-2xl font-bold tracking-tight">Two-Factor Authentication</h1>

                    <p className="mt-2 text-sm text-white/60 leading-relaxed">
                        Enter the 6-digit verification code from your authenticator app (Google Authenticator, Authy, or 1Password) to access SpendX.
                    </p>
                </div>

                {errorMessage && (
                    <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                        <AlertCircle className="h-5 w-5 shrink-0 text-red-400 mt-0.5" />
                        <span className="flex-1">{errorMessage}</span>
                    </div>
                )}

                <form onSubmit={handleVerify} className="space-y-6">
                    <div>
                        <label className="mb-3 block text-center text-xs font-semibold uppercase tracking-wider text-white/50">
                            Authentication Code
                        </label>

                        {/* 6-Digit Segmented Code Inputs */}
                        <div className="flex justify-center gap-2.5 sm:gap-3">
                            {digits.map((digit, idx) => (
                                <input
                                    key={idx}
                                    ref={(el) => {
                                        inputRefs.current[idx] = el;
                                    }}
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    maxLength={idx === 0 ? 6 : 1}
                                    value={digit}
                                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(idx, e)}
                                    onPaste={handlePaste}
                                    disabled={submitting}
                                    className="h-13 w-11 sm:h-14 sm:w-12 rounded-xl border border-white/15 bg-white/[0.08] text-center font-mono text-2xl font-bold text-white outline-none transition focus:border-emerald-400 focus:bg-white/[0.12] focus:ring-2 focus:ring-emerald-400/20 disabled:opacity-50"
                                />
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting || digits.join("").length !== 6}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-3.5 font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60 shadow-lg shadow-blue-500/20"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span>Verifying Code...</span>
                            </>
                        ) : (
                            <>
                                <span>Verify & Continue</span>
                                <ArrowRight className="h-4 w-4" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-center">
                    <button
                        type="button"
                        onClick={handleSignOut}
                        disabled={signingOut || submitting}
                        className="flex items-center gap-2 text-xs font-medium text-white/50 transition hover:text-white/80 disabled:opacity-50"
                    >
                        {signingOut ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span>Signing out...</span>
                            </>
                        ) : (
                            <>
                                <LogOut className="h-3.5 w-3.5" />
                                <span>Cancel and back to sign in</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </main>
    );
}
