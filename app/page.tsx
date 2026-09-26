"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function HomePage() {
  const router = useRouter();
  const [status, setStatus] = useState("Checking session...");

  useEffect(() => {
    async function checkSession() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        setStatus("Redirecting to login...");
        router.replace("/login");
        return;
      }

      const { data: mfaData } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (
        mfaData &&
        mfaData.nextLevel === "aal2" &&
        mfaData.currentLevel !== "aal2"
      ) {
        setStatus("Redirecting to two-factor verification...");
        router.replace("/auth/verify-2fa");
        return;
      }

      setStatus("Redirecting to dashboard...");
      router.replace("/dashboard");
    }

    checkSession();
  }, [router]);

  return (
    <main className="sx-screen flex items-center justify-center px-6">
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.03] px-8 py-7 shadow-2xl">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
        <div className="text-center">
          <h1 className="text-xl font-bold font-mono">SpendX</h1>
          <p className="mt-1 text-sm text-zinc-400">{status}</p>
        </div>
      </div>
    </main>
  );
}