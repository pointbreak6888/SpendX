"use client";

import { ArrowLeft, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import AuthGuard from "@/components/AuthGuard";
import ChatWindow from "@/components/chatbot/ChatWindow";

export default function AssistantPage() {
    const router = useRouter();

    return (
        <AuthGuard>
            <div className="sx-screen min-h-screen">
                <main className="mx-auto max-w-5xl px-4 pb-32 pt-24 sm:px-6 sm:pt-28">
                    {/* Page header */}
                    <div className="mb-6 flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() =>
                                router.back()
                            }
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card/30 sx-muted transition-colors hover:bg-card/60 hover:sx-title"
                            aria-label="Go back"
                        >
                            <ArrowLeft
                                size={18}
                            />
                        </button>

                        <div>
                            <div className="flex items-center gap-2">
                                <Sparkles
                                    size={18}
                                    className="text-emerald-400"
                                />

                                <h1 className="font-mono text-xl font-bold sx-title sm:text-2xl">
                                    SpendX
                                    Assistant
                                </h1>
                            </div>

                            <p className="mt-1 text-xs sx-muted sm:text-sm">
                                Ask questions about
                                your spending and
                                transactions.
                            </p>
                        </div>
                    </div>

                    {/* Chat */}
                    <ChatWindow />
                </main>
            </div>
        </AuthGuard>
    );
}