"use client";

import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { FeedbackType, FeedbackReason } from "@/lib/types";

interface FeedbackControlProps {
    insightId: string;
    onFeedback?: (
        insightId: string,
        feedback: FeedbackType,
        reason?: FeedbackReason
    ) => void;
    compact?: boolean;
}

const reasons: { value: FeedbackReason; label: string }[] = [
    { value: "not_accurate", label: "Not accurate" },
    { value: "not_relevant", label: "Not relevant" },
    { value: "hard_to_understand", label: "Hard to understand" },
    { value: "other", label: "Other" },
];

export function FeedbackControl({
    insightId,
    onFeedback,
    compact = false,
}: FeedbackControlProps) {
    const [feedback, setFeedback] = useState<FeedbackType | null>(null);
    const [showReasons, setShowReasons] = useState(false);

    const handleFeedback = (type: FeedbackType) => {
        setFeedback(type);
        if (type === "negative") {
            setShowReasons(true);
        } else {
            onFeedback?.(insightId, type);
        }
    };

    const handleReason = (reason: FeedbackReason) => {
        setShowReasons(false);
        onFeedback?.(insightId, "negative", reason);
    };

    if (feedback && !showReasons) {
        return (
            <span className="text-[11px] text-muted-foreground animate-fade-in">
                Thanks for the feedback
            </span>
        );
    }

    return (
        <div className="flex items-center gap-1">
            {!feedback && (
                <>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "h-7 w-7 text-muted-foreground hover:text-success",
                                    compact && "h-6 w-6"
                                )}
                                onClick={() => handleFeedback("positive")}
                            >
                                <ThumbsUp className={cn("h-3.5 w-3.5", compact && "h-3 w-3")} />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Helpful</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "h-7 w-7 text-muted-foreground hover:text-destructive",
                                    compact && "h-6 w-6"
                                )}
                                onClick={() => handleFeedback("negative")}
                            >
                                <ThumbsDown className={cn("h-3.5 w-3.5", compact && "h-3 w-3")} />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Not helpful</TooltipContent>
                    </Tooltip>
                </>
            )}

            {showReasons && (
                <div className="flex flex-wrap gap-1 animate-fade-in">
                    {reasons.map((r) => (
                        <button
                            key={r.value}
                            onClick={() => handleReason(r.value)}
                            className="rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
