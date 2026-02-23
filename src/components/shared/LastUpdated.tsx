"use client";

import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface LastUpdatedProps {
    lastSyncedAt: string | null;
    isStale?: boolean;
    onRefresh?: () => void;
    isRefreshing?: boolean;
}

export function LastUpdated({
    lastSyncedAt,
    isStale = false,
    onRefresh,
    isRefreshing = false,
}: LastUpdatedProps) {
    const formatTimestamp = (iso: string) => {
        const date = new Date(iso);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor(diffMs / (1000 * 60));

        if (diffMinutes < 1) return "Just now";
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    if (!lastSyncedAt) {
        return (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                <span>No data synced yet</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <div
                className={cn(
                    "h-1.5 w-1.5 rounded-full transition-colors",
                    isStale ? "bg-severity-warning animate-pulse-soft" : "bg-success"
                )}
            />
            <span
                className={cn(
                    "text-xs",
                    isStale ? "text-severity-warning font-medium" : "text-muted-foreground"
                )}
            >
                {isStale ? "Data may be out of date · " : "Last updated "}
                {formatTimestamp(lastSyncedAt)}
            </span>
            {onRefresh && (
                <button
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    className="ml-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
                    title="Refresh data"
                >
                    <RefreshCw
                        className={cn(
                            "h-3 w-3",
                            isRefreshing && "animate-spin"
                        )}
                    />
                </button>
            )}
        </div>
    );
}
