"use client";

import { useState } from "react";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FeedbackControl } from "@/components/shared/FeedbackControl";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/types";

const exampleQueries = [
    "Why is my profit lower this month?",
    "Where am I overspending?",
    "Are my expenses under control?",
    "Which costs are increasing?",
];

export function QuestionBox() {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (query: string) => {
        if (!query.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            role: "user",
            content: query.trim(),
            timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question: query.trim() }),
            });

            const data = await res.json();

            const aiMessage: ChatMessage = {
                id: `ai-${Date.now()}`,
                role: "assistant",
                content: data.answer || data.error || "Sorry, I couldn't process that question.",
                timestamp: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, aiMessage]);
        } catch (error) {
            console.error("Chat error:", error);
            const errorMessage: ChatMessage = {
                id: `ai-error-${Date.now()}`,
                role: "assistant",
                content:
                    "I'm having trouble connecting right now. Please try again in a moment.",
                timestamp: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">
                    Ask About Your Business
                </h2>
            </div>

            {/* Conversation */}
            {messages.length > 0 && (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={cn(
                                "animate-slide-up",
                                msg.role === "user" ? "flex justify-end" : "flex justify-start"
                            )}
                        >
                            <div
                                className={cn(
                                    "max-w-[85%] rounded-xl px-4 py-3 text-sm",
                                    msg.role === "user"
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted"
                                )}
                            >
                                <p className="leading-relaxed whitespace-pre-wrap">
                                    {msg.content}
                                </p>
                                {msg.role === "assistant" && (
                                    <div className="mt-2 flex items-center justify-between border-t border-border/20 pt-2">
                                        <span className="text-[10px] text-muted-foreground/60">
                                            Was this helpful?
                                        </span>
                                        <FeedbackControl insightId={msg.id} compact />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start animate-fade-in">
                            <div className="flex items-center gap-2 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Analyzing your data...
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Example queries (show when no messages) */}
            {messages.length === 0 && (
                <div className="grid grid-cols-2 gap-2">
                    {exampleQueries.map((q) => (
                        <button
                            key={q}
                            onClick={() => handleSubmit(q)}
                            className="rounded-lg border border-border/60 bg-card px-3 py-2.5 text-left text-xs text-muted-foreground transition-all duration-200 hover:border-primary/30 hover:bg-accent hover:text-foreground"
                        >
                            {q}
                        </button>
                    ))}
                </div>
            )}

            {/* Input */}
            <div className="relative">
                <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit(input);
                        }
                    }}
                    placeholder="Ask anything about your business finances..."
                    className="min-h-[48px] resize-none pr-12 text-sm"
                    rows={1}
                />
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleSubmit(input)}
                    disabled={!input.trim() || isLoading}
                    className="absolute bottom-1.5 right-1.5 h-8 w-8 text-muted-foreground hover:text-primary"
                >
                    <Send className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
