"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FeedbackControl } from "@/components/shared/FeedbackControl";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import { cn } from "@/lib/utils";
import type { AIInsight } from "@/lib/types";
import {
    TrendingDown,
    TrendingUp,
    ArrowRight,
    AlertTriangle,
    BarChart3,
    Zap,
} from "lucide-react";

interface InsightCardProps {
    insight: AIInsight;
    index?: number;
    onFeedback?: (
        insightId: string,
        feedback: "positive" | "negative",
        reason?: string
    ) => void;
}

const typeConfig = {
    variance: { icon: BarChart3, accent: "text-chart-1" },
    trend: { icon: TrendingUp, accent: "text-chart-2" },
    anomaly: { icon: Zap, accent: "text-chart-5" },
    health_signal: { icon: TrendingUp, accent: "text-success" },
    issue: { icon: AlertTriangle, accent: "text-severity-warning" },
};

export function InsightCard({ insight, index = 0, onFeedback }: InsightCardProps) {
    const config = typeConfig[insight.type];
    const Icon = config.icon;

    return (
        <Card
            className={cn(
                "group relative overflow-hidden border-border/60 bg-card transition-all duration-300 hover:border-primary/20 hover:shadow-md",
                "animate-slide-up"
            )}
            style={{ animationDelay: `${index * 80}ms` }}
        >
            {/* Subtle accent bar */}
            <div
                className={cn(
                    "absolute left-0 top-0 h-full w-[3px] transition-all duration-300",
                    insight.severity === "critical" && "bg-severity-critical",
                    insight.severity === "warning" && "bg-severity-warning",
                    insight.severity === "info" && "bg-severity-info",
                    !insight.severity && "bg-primary/30 group-hover:bg-primary"
                )}
            />

            <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2 pl-5">
                <div className="flex items-start gap-3">
                    <div
                        className={cn(
                            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60",
                            config.accent
                        )}
                    >
                        <Icon className="h-4 w-4" />
                    </div>
                    <div>
                        {insight.severity && (
                            <div className="mb-1.5">
                                <SeverityBadge severity={insight.severity} size="sm" />
                            </div>
                        )}
                        <p className="text-sm font-medium leading-snug text-foreground">
                            {insight.summary}
                        </p>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pl-5">
                {/* Evidence */}
                <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                    {insight.evidence}
                </p>

                {/* Action suggestion */}
                {insight.action && (
                    <div className="mb-3 flex items-center gap-2 rounded-md bg-primary/5 px-3 py-2">
                        <ArrowRight className="h-3 w-3 shrink-0 text-primary" />
                        <span className="text-xs text-primary/90">{insight.action}</span>
                    </div>
                )}

                {/* Footer: Confidence + Feedback */}
                <div className="flex items-center justify-between border-t border-border/40 pt-2">
                    <div className="flex items-center gap-2">
                        <div
                            className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                insight.confidence === "high" && "bg-success",
                                insight.confidence === "medium" && "bg-severity-warning",
                                insight.confidence === "low" && "bg-severity-critical"
                            )}
                        />
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                            {insight.confidence} confidence
                        </span>
                    </div>
                    <FeedbackControl insightId={insight.id} onFeedback={onFeedback} compact />
                </div>
            </CardContent>
        </Card>
    );
}
