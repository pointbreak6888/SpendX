"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
    authenticateBiometric,
    getStoredBiometricCredentialId,
} from "@/lib/biometric";
import {
    Loader2,
    Sparkles,
    Fingerprint,
    AlertTriangle,
} from "lucide-react";

export default function WelcomePage() {
    const router = useRouter();

    const [name, setName] = useState("User");
    const [loading, setLoading] = useState(true);
    const [verifyingBiometric, setVerifyingBiometric] =
        useState(false);
    const [biometricError, setBiometricError] = useState("");

    useEffect(() => {
        let redirectTimer: ReturnType<typeof setTimeout> | undefined;
        let cancelled = false;

        async function continueToDashboard() {
            try {
                /*
                 * Check whether the user has enabled
                 * Biometric Lock in SpendX.
                 */
                const savedSettings =
                    localStorage.getItem("spendx-settings");

                let biometricLockEnabled = false;

                if (savedSettings) {
                    try {
                        const parsed = JSON.parse(
                            savedSettings
                        );

                        biometricLockEnabled =
                            parsed?.biometricLock === true;
                    } catch (error) {
                        console.error(
                            "Parse biometric settings error:",
                            error
                        );
                    }
                }

                /*
                 * If biometric protection is disabled,
                 * go directly to the dashboard.
                 */
                if (!biometricLockEnabled) {
                    router.replace("/dashboard");
                    return;
                }

                /*
                 * Biometric Lock is enabled, so make sure
                 * this browser still has the registered
                 * WebAuthn credential.
                 */
                const storedCredentialId =
                    getStoredBiometricCredentialId();

                if (!storedCredentialId) {
                    setBiometricError(
                        "Biometric Lock is enabled, but no biometric credential is available on this device. Please return to Settings and register Biometric Lock again."
                    );

                    setVerifyingBiometric(false);
                    return;
                }

                if (cancelled) {
                    return;
                }

                setVerifyingBiometric(true);
                setBiometricError("");

                /*
                 * Request the device biometric/platform
                 * authenticator.
                 */
                const verified =
                    await authenticateBiometric();

                if (cancelled) {
                    return;
                }

                if (!verified) {
                    setVerifyingBiometric(false);

                    setBiometricError(
                        "Biometric verification failed or was cancelled. Please try again to access SpendX."
                    );

                    return;
                }

                /*
                 * Biometric verification succeeded.
                 * This is the only point where the user
                 * proceeds into the application.
                 */
                router.replace("/dashboard");
            } catch (error) {
                console.error(
                    "Welcome biometric verification error:",
                    error
                );

                if (cancelled) {
                    return;
                }

                setVerifyingBiometric(false);

                if (
                    error instanceof DOMException &&
                    error.name === "NotAllowedError"
                ) {
                    setBiometricError(
                        "Biometric verification was cancelled or not completed. Please try again."
                    );
                } else if (error instanceof Error) {
                    setBiometricError(error.message);
                } else {
                    setBiometricError(
                        "Biometric verification failed. Please try again."
                    );
                }
            }
        }

        async function loadUser() {
            try {
                const {
                    data: { session },
                    error: sessionError,
                } = await supabase.auth.getSession();

                if (
                    sessionError ||
                    !session?.user
                ) {
                    router.replace("/login");
                    return;
                }

                const user = session.user;

                const displayName =
                    user.user_metadata?.full_name ||
                    user.user_metadata?.name ||
                    user.email?.split("@")[0] ||
                    "User";

                if (cancelled) {
                    return;
                }

                setName(displayName);
                setLoading(false);

                /*
                 * Keep the existing welcome animation.
                 * After 2.2 seconds, perform the biometric
                 * check if Biometric Lock is enabled.
                 */
                redirectTimer = setTimeout(() => {
                    void continueToDashboard();
                }, 2200);
            } catch (error) {
                console.error(
                    "Welcome page error:",
                    error
                );

                router.replace("/login");
            }
        }

        void loadUser();

        return () => {
            cancelled = true;

            if (redirectTimer) {
                clearTimeout(redirectTimer);
            }
        };
    }, [router]);

    /*
     * Allow the user to retry biometric authentication
     * without leaving the Welcome page.
     */
    async function handleRetryBiometric() {
        try {
            setBiometricError("");
            setVerifyingBiometric(true);

            const storedCredentialId =
                getStoredBiometricCredentialId();

            if (!storedCredentialId) {
                throw new Error(
                    "No biometric credential is registered on this device. Please register Biometric Lock again from Settings."
                );
            }

            const verified =
                await authenticateBiometric();

            if (!verified) {
                throw new Error(
                    "Biometric verification failed or was cancelled. Please try again."
                );
            }

            router.replace("/dashboard");
        } catch (error) {
            console.error(
                "Retry biometric verification error:",
                error
            );

            setVerifyingBiometric(false);

            if (
                error instanceof DOMException &&
                error.name === "NotAllowedError"
            ) {
                setBiometricError(
                    "Biometric verification was cancelled or not completed. Please try again."
                );
            } else if (error instanceof Error) {
                setBiometricError(error.message);
            } else {
                setBiometricError(
                    "Biometric verification failed. Please try again."
                );
            }
        }
    }

    return (
        <main className="sx-screen relative flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0">
                <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/15 blur-3xl" />

                <div className="absolute right-10 top-20 h-[260px] w-[260px] rounded-full bg-blue-500/10 blur-3xl" />

                <div className="absolute bottom-10 left-10 h-[260px] w-[260px] rounded-full bg-violet-500/10 blur-3xl" />
            </div>

            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />

            <section className="relative z-10 flex w-full max-w-lg flex-col items-center px-6 text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                    {loading ? (
                        <Loader2 className="h-7 w-7 animate-spin text-white" />
                    ) : verifyingBiometric ? (
                        <Fingerprint className="h-7 w-7 animate-pulse text-emerald-300" />
                    ) : biometricError ? (
                        <AlertTriangle className="h-7 w-7 text-amber-300" />
                    ) : (
                        <Sparkles className="h-7 w-7 text-emerald-300" />
                    )}
                </div>

                <p className="mb-3 text-sm font-medium uppercase tracking-[0.35em] text-white/45">
                    SpendX Finance OS
                </p>

                <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
                    Welcome back,
                </h1>

                <h2 className="mt-3 max-w-[90vw] truncate text-3xl font-bold tracking-tight text-emerald-300 sm:text-5xl">
                    {name}
                </h2>

                {verifyingBiometric ? (
                    <>
                        <div className="mt-8 flex items-center gap-3 text-emerald-300">
                            <Fingerprint
                                size={22}
                                className="animate-pulse"
                            />

                            <p className="text-sm font-medium">
                                Verify your identity to continue
                            </p>
                        </div>

                        <p className="mt-3 max-w-sm text-sm leading-6 text-white/50">
                            Use your device fingerprint, face
                            authentication, or other supported
                            device security method.
                        </p>

                        <div className="mt-8 h-1.5 w-56 overflow-hidden rounded-full bg-white/10">
                            <div className="h-full w-full animate-pulse rounded-full bg-emerald-400" />
                        </div>
                    </>
                ) : biometricError ? (
                    <>
                        <div className="mt-8 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-5 py-4">
                            <div className="flex items-start gap-3 text-left">
                                <AlertTriangle
                                    size={19}
                                    className="mt-0.5 shrink-0 text-amber-400"
                                />

                                <p className="text-sm leading-6 text-amber-200">
                                    {biometricError}
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={
                                handleRetryBiometric
                            }
                            className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-3 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20"
                        >
                            <Fingerprint size={17} />
                            Try Biometric Verification Again
                        </button>
                    </>
                ) : (
                    <>
                        <p className="mt-6 text-sm text-white/50">
                            Preparing your dashboard...
                        </p>

                        <div className="mt-8 h-1.5 w-56 overflow-hidden rounded-full bg-white/10">
                            <div className="h-full w-full animate-[welcomeProgress_2.2s_ease-in-out_forwards] rounded-full bg-emerald-400" />
                        </div>
                    </>
                )}
            </section>

            <style jsx>{`
                @keyframes welcomeProgress {
                    from {
                        transform: translateX(-100%);
                    }

                    to {
                        transform: translateX(0%);
                    }
                }
            `}</style>
        </main>
    );
}