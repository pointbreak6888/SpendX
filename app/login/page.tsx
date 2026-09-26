"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function checkUserSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          const { data: aalData } =
            await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

          if (
            aalData &&
            aalData.nextLevel === "aal2" &&
            aalData.currentLevel !== "aal2"
          ) {
            router.replace("/auth/verify-2fa");
            return;
          }

          router.replace("/dashboard");
          return;
        }
      } catch (error) {
        console.error("Session check error:", error);
      } finally {
        setCheckingSession(false);
      }
    }

    checkUserSession();
  }, [router]);

  const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setErrorMessage("");

    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      // Check MFA Authenticator Assurance Level
      const { data: aalData, error: aalError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (
        !aalError &&
        aalData &&
        aalData.nextLevel === "aal2" &&
        aalData.currentLevel !== "aal2"
      ) {
        router.replace("/auth/verify-2fa");
        return;
      }

      router.replace("/dashboard");
    } catch (error) {
      console.error("Email login error:", error);
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setErrorMessage("");

      const redirectTo = `${window.location.origin}/auth/callback?next=/dashboard`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setGoogleLoading(false);
      }
    } catch (error) {
      console.error("Google login error:", error);
      setErrorMessage("Google sign-in failed. Please try again.");
      setGoogleLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-[#050816] text-white flex items-center justify-center px-4">
        <div className="flex items-center gap-3 text-white/80">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Checking session...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050816] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-2xl font-bold">
            X
          </div>

          <h1 className="text-3xl font-bold tracking-tight">Welcome to SpendX</h1>

          <p className="mt-2 text-sm text-white/60">
            Sign in to manage your expenses smarter.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          className="mb-5 flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white px-4 py-3 font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {googleLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Signing in with Google...
            </>
          ) : (
            <>
              <span className="text-lg">G</span>
              Continue with Google
            </>
          )}
        </button>

        <div className="mb-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs uppercase tracking-wider text-white/40">
            or
          </span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm text-white/70">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-white/10 bg-white/[0.08] px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-white/30 focus:bg-white/[0.1]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-white/70">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-xl border border-white/10 bg-white/[0.08] px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-white/30 focus:bg-white/[0.1]"
            />
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-3 font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/50">
          New to SpendX?{" "}
          <button
            type="button"
            onClick={() => router.push("/signup")}
            className="font-medium text-blue-300 hover:text-blue-200"
          >
            Create an account
          </button>
        </p>
      </div>
    </main>
  );
}