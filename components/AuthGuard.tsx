"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AuthGuard({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        let isMounted = true;

        async function checkAuth() {
            const {
                data: { user },
                error,
            } = await supabase.auth.getUser();

            if (error || !user) {
                if (isMounted) {
                    router.replace("/login");
                }
                return;
            }

            const { data: mfaData, error: mfaError } =
                await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

            if (!mfaError && mfaData) {
                if (
                    mfaData.nextLevel === "aal2" &&
                    mfaData.currentLevel !== "aal2"
                ) {
                    if (pathname !== "/auth/verify-2fa") {
                        if (isMounted) {
                            router.replace("/auth/verify-2fa");
                        }
                        return;
                    }
                }
            }

            if (isMounted) {
                setChecking(false);
            }
        }

        void checkAuth();

        return () => {
            isMounted = false;
        };
    }, [router, pathname]);

    if (checking) {
        return (
            <main className="sx-screen flex items-center justify-center px-6">
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-4 text-sm text-zinc-300">
                    <Loader2
                        size={18}
                        className="animate-spin text-indigo-400"
                    />
                    Checking access...
                </div>
            </main>
        );
    }

    return <>{children}</>;
}