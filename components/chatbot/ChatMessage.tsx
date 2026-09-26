type ChatMessageProps = {
    role: "user" | "assistant";
    content: string;
};

export default function ChatMessage({
    role,
    content,
}: ChatMessageProps) {
    const isUser = role === "user";

    return (
        <div
            className={`flex w-full ${isUser
                    ? "justify-end"
                    : "justify-start"
                }`}
        >
            <div
                className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-6 ${isUser
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card/50 sx-title"
                    }`}
            >
                {content}
            </div>
        </div>
    );
}