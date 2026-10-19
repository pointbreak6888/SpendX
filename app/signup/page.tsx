"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
    const router = useRouter();

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    useEffect(() => {
        let mounted = true;

        async function checkSession() {
            try {
                const {
                    data: { session },
                    error,
                } = await supabase.auth.getSession();

                if (error) {
                    throw error;
                }

                if (mounted && session) {
                    router.replace("/dashboard");
                    return;
                }
            } catch (error) {
                console.error("Signup session check error:", error);
            } finally {
                if (mounted) {
                    setCheckingSession(false);
                }
            }
        }

        checkSession();

        return () => {
            mounted = false;
        };
    }, [router]);

    const handleSignup = async (
        e: React.FormEvent<HTMLFormElement>
    ) => {
        e.preventDefault();

        setErrorMessage("");
        setSuccessMessage("");

        const trimmedName = fullName.trim();
        const trimmedEmail = email.trim();

        if (!trimmedName || !trimmedEmail || !password || !confirmPassword) {
            setErrorMessage("Please fill in all fields.");
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            setErrorMessage("Please enter a valid email address.");
            return;
        }

        if (password.length < 8) {
            setErrorMessage("Password must contain at least 8 characters.");
            return;
        }

        if (password !== confirmPassword) {
            setErrorMessage("Passwords do not match.");
            return;
        }

        try {
            setLoading(true);

            const redirectTo = `${window.location.origin}/auth/callback?next=/dashboard`;

            const { data, error } = await supabase.auth.signUp({
                email: trimmedEmail,
                password,
                options: {
                    data: {
                        full_name: trimmedName,
                    },
                    emailRedirectTo: redirectTo,
                },
            });

            if (error) {
                setErrorMessage(error.message);
                return;
            }

            if (data.session) {
                router.replace("/dashboard");
                return;
            }

            setSuccessMessage(
                "Your account has been created. Please check your email for a verification link before signing in."
            );
        } catch (error) {
            console.error("Signup error:", error);

            setErrorMessage(
                "Something went wrong while creating your account. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    if (checkingSession) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#050816] px-4 text-white">
                <div className="flex items-center gap-3 text-white/80">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Checking session...</span>
                </div>
            </main>
        );
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#050816] px-4 py-10 text-white">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur-xl">
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-2xl font-bold">
                        X
                    </div>

                    <h1 className="text-3xl font-bold tracking-tight">
                        Create your SpendX account
                    </h1>

                    <p className="mt-2 text-sm text-white/60">
                        Start managing your expenses smarter.
                    </p>
                </div>

                {errorMessage && (
                    <div
                        role="alert"
                        className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                    >
                        {errorMessage}
                    </div>
                )}

                {successMessage && (
                    <div
                        role="status"
                        className="mb-5 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-200"
                    >
                        {successMessage}
                    </div>
                )}

                <form onSubmit={handleSignup} className="space-y-4">
                    <div>
                        <label
                            htmlFor="fullName"
                            className="mb-2 block text-sm text-white/70"
                        >
                            Full name
                        </label>

                        <input
                            id="fullName"
                            type="text"
                            autoComplete="name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Enter your full name"
                            required
                            className="w-full rounded-xl border border-white/10 bg-white/[0.08] px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-white/30"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="email"
                            className="mb-2 block text-sm text-white/70"
                        >
                            Email
                        </label>

                        <input
                            id="email"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                            className="w-full rounded-xl border border-white/10 bg-white/[0.08] px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-white/30"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="password"
                            className="mb-2 block text-sm text-white/70"
                        >
                            Password
                        </label>

                        <input
                            id="password"
                            type="password"
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="At least 8 characters"
                            minLength={8}
                            required
                            className="w-full rounded-xl border border-white/10 bg-white/[0.08] px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-white/30"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="confirmPassword"
                            className="mb-2 block text-sm text-white/70"
                        >
                            Confirm password
                        </label>

                        <input
                            id="confirmPassword"
                            type="password"
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Enter your password again"
                            minLength={8}
                            required
                            className="w-full rounded-xl border border-white/10 bg-white/[0.08] px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-white/30"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-3 font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Creating account...
                            </>
                        ) : (
                            "Create account"
                        )}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-white/50">
                    Already have an account?{" "}
                    <button
                        type="button"
                        onClick={() => router.push("/login")}
                        className="font-medium text-blue-300 hover:text-blue-200"
                    >
                        Sign in
                    </button>
                </p>
            </div>
        </main>
    );
}