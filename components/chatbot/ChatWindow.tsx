"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import ChatInput from "./ChatInput";
import ChatMessage from "./ChatMessage";

import { parseQuestion } from "@/lib/Chatbot/parser";
import { calculateInsight } from "@/lib/Chatbot/insights";
import { generateResponse } from "@/lib/Chatbot/responses";

type Message = {
    id: string;
    role: "user" | "assistant";
    content: string;
};

const initialMessage: Message = {
    id: "welcome",
    role: "assistant",
    content:
        "Hi! I'm your SpendX Assistant. I can help you understand your spending, income, savings, and transaction history.",
};

export default function ChatWindow() {
    const [messages, setMessages] = useState<Message[]>([
        initialMessage,
    ]);

    const [loading, setLoading] = useState(false);

    async function processQuestion(question: string) {
        const trimmedQuestion = question.trim();

        if (!trimmedQuestion || loading) {
            return;
        }

        // Add user's question to the chat
        const userMessage: Message = {
            id: `${Date.now()}-user`,
            role: "user",
            content: trimmedQuestion,
        };

        setMessages((current) => [
            ...current,
            userMessage,
        ]);

        setLoading(true);

        try {
            // Parse the user's natural-language question
            const parsedQuestion = parseQuestion(
                trimmedQuestion
            );

            // Calculate the answer using the user's
            // actual transaction data
            const insight = await calculateInsight(
                parsedQuestion
            );

            // Convert the calculated result into
            // a human-readable response
            const response = generateResponse(
                insight
            );

            const assistantMessage: Message = {
                id: `${Date.now()}-assistant`,
                role: "assistant",
                content: response,
            };

            setMessages((current) => [
                ...current,
                assistantMessage,
            ]);
        } catch (error) {
            console.error(
                "Assistant error:",
                error
            );

            const errorMessage: Message = {
                id: `${Date.now()}-error`,
                role: "assistant",
                content:
                    "I couldn't process that question right now. Please try again.",
            };

            setMessages((current) => [
                ...current,
                errorMessage,
            ]);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-[600px] flex-col overflow-hidden rounded-3xl border border-border bg-card/20 shadow-2xl">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border/60 px-5 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
                    <Sparkles
                        size={19}
                        className="text-emerald-400"
                    />
                </div>

                <div>
                    <h2 className="font-mono text-sm font-semibold sx-title">
                        SpendX Assistant
                    </h2>

                    <p className="text-xs sx-muted">
                        Ask questions about your
                        spending and transactions
                    </p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
                {messages.map((message) => (
                    <ChatMessage
                        key={message.id}
                        role={message.role}
                        content={message.content}
                    />
                ))}

                {/* Loading indicator */}
                {loading && (
                    <div className="flex justify-start">
                        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card/50 px-4 py-3 text-sm sx-muted">
                            <Loader2
                                size={15}
                                className="animate-spin"
                            />

                            <span>
                                Analyzing your
                                transactions...
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="border-t border-border/60 p-4">
                <ChatInput
                    onSubmit={processQuestion}
                    disabled={loading}
                />
            </div>
        </div>
    );
}