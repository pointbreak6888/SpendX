"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, Loader2, Send, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Message = {
    role: "user" | "assistant";
    content: string;
};

export default function AIPage() {
    const [question, setQuestion] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const trimmedQuestion = question.trim();

        if (!trimmedQuestion || loading) {
            return;
        }

        setMessages((current) => [
            ...current,
            {
                role: "user",
                content: trimmedQuestion,
            },
        ]);

        setQuestion("");
        setLoading(true);

        try {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!session?.access_token) {
                throw new Error("Please log in again.");
            }

            const response = await fetch("/api/ai/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    question: trimmedQuestion,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data?.error || "Unable to get an AI response."
                );
            }

            setMessages((current) => [
                ...current,
                {
                    role: "assistant",
                    content: data.answer,
                },
            ]);
        } catch (error) {
            console.error("AI chat error:", error);

            setMessages((current) => [
                ...current,
                {
                    role: "assistant",
                    content:
                        error instanceof Error
                            ? error.message
                            : "Something went wrong while contacting SpendX AI.",
                },
            ]);
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-background px-4 pb-10 pt-28 sm:px-6 sm:pt-36">
            <div className="mx-auto flex w-full max-w-4xl flex-col">
                <div className="mb-6 flex items-center justify-between">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card/60 px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Dashboard
                    </Link>
                </div>

                <section className="overflow-hidden rounded-3xl border border-border/60 bg-card/70 shadow-xl backdrop-blur-xl">
                    <div className="border-b border-border/60 bg-gradient-to-r from-primary/10 via-transparent to-transparent p-6 sm:p-8">
                        <div className="flex items-center gap-4">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-cyan-500 to-emerald-500 shadow-lg">
                                <Bot className="h-7 w-7 text-white" />
                            </div>

                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                                        SpendX AI
                                    </h1>
                                    <Sparkles className="h-5 w-5 text-primary" />
                                </div>

                                <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                                    Ask questions about your recorded income and
                                    expenses.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="min-h-[420px] space-y-4 p-4 sm:p-6">
                        {messages.length === 0 ? (
                            <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                                <Bot className="mb-4 h-12 w-12 text-primary/70" />

                                <h2 className="text-xl font-bold text-foreground">
                                    How can I help?
                                </h2>

                                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                                    Try asking things like:
                                </p>

                                <div className="mt-5 grid w-full max-w-xl gap-3 sm:grid-cols-2">
                                    {[
                                        "How much have I spent?",
                                        "What category do I spend the most on?",
                                        "What is my current balance?",
                                        "Show me my recent spending.",
                                    ].map((suggestion) => (
                                        <button
                                            key={suggestion}
                                            type="button"
                                            onClick={() =>
                                                setQuestion(suggestion)
                                            }
                                            className="rounded-2xl border border-border/60 bg-background/50 p-4 text-left text-sm font-medium text-foreground transition hover:border-primary/40 hover:bg-accent"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            messages.map((message, index) => (
                                <div
                                    key={`${message.role}-${index}`}
                                    className={`flex ${message.role === "user"
                                            ? "justify-end"
                                            : "justify-start"
                                        }`}
                                >
                                    <div
                                        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[75%] ${message.role === "user"
                                                ? "rounded-br-md bg-primary text-primary-foreground"
                                                : "rounded-bl-md border border-border/60 bg-muted text-foreground"
                                            }`}
                                    >
                                        {message.content}
                                    </div>
                                </div>
                            ))
                        )}

                        {loading && (
                            <div className="flex justify-start">
                                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-border/60 bg-muted px-4 py-3 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    SpendX AI is thinking...
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-border/60 p-4 sm:p-6">
                        <form
                            onSubmit={handleSubmit}
                            className="flex items-end gap-3"
                        >
                            <textarea
                                value={question}
                                onChange={(event) =>
                                    setQuestion(event.target.value)
                                }
                                onKeyDown={(event) => {
                                    if (
                                        event.key === "Enter" &&
                                        !event.shiftKey
                                    ) {
                                        event.preventDefault();
                                        event.currentTarget.form?.requestSubmit();
                                    }
                                }}
                                placeholder="Ask SpendX AI about your finances..."
                                rows={2}
                                disabled={loading}
                                className="min-h-12 flex-1 resize-none rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                            />

                            <button
                                type="submit"
                                disabled={loading || !question.trim()}
                                aria-label="Send question"
                                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {loading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <Send className="h-5 w-5" />
                                )}
                            </button>
                        </form>

                        <p className="mt-3 text-center text-xs text-muted-foreground">
                            SpendX AI analyzes your recorded transactions. It
                            does not access your bank account or make financial
                            transactions.
                        </p>
                    </div>
                </section>
            </div>
        </main>
    );
}