"use client";

import {
    FormEvent,
    useState,
} from "react";
import { ArrowUp } from "lucide-react";

type ChatInputProps = {
    onSubmit: (question: string) => void;
    disabled?: boolean;
};

export default function ChatInput({
    onSubmit,
    disabled = false,
}: ChatInputProps) {
    const [value, setValue] = useState("");

    function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        const question = value.trim();

        if (!question || disabled) {
            return;
        }

        onSubmit(question);
        setValue("");
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 rounded-2xl border border-border bg-card/50 p-2"
        >
            <input
                type="text"
                value={value}
                onChange={(event) =>
                    setValue(event.target.value)
                }
                disabled={disabled}
                placeholder="Ask about your spending..."
                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
            />

            <button
                type="submit"
                disabled={
                    disabled ||
                    !value.trim()
                }
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Send question"
            >
                <ArrowUp size={18} />
            </button>
        </form>
    );
}