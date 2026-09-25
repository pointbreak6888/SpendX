"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function AssistantButton() {
    return (
        <Link
            href="/assistant"
            aria-label="Open SpendX Assistant"
            title="SpendX Assistant"
            className="
                fixed bottom-24 right-5 z-[60]
                flex h-14 w-14 items-center justify-center
                rounded-full
                border border-emerald-400/30
                bg-emerald-500/15
                text-emerald-300
                shadow-[0_8px_30px_rgba(16,185,129,0.25)]
                backdrop-blur-xl
                transition-all duration-300
                hover:scale-110
                hover:bg-emerald-500/25
                hover:shadow-[0_10px_35px_rgba(16,185,129,0.35)]
                active:scale-95
                dark:border-emerald-400/25
                dark:bg-emerald-400/10
            "
        >
            <Sparkles
                size={24}
                strokeWidth={2}
            />

            <span
                className="
                    pointer-events-none absolute right-16
                    whitespace-nowrap rounded-lg
                    border border-border
                    bg-background/90 px-3 py-2
                    text-xs font-medium text-foreground
                    opacity-0 shadow-lg
                    backdrop-blur-xl
                    transition-opacity duration-200
                    group-hover:opacity-100
                "
            >
                SpendX Assistant
            </span>
        </Link>
    );
}