"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RatioResult } from "@/lib/types";

interface HealthSignalsProps {
    signals: RatioResult[];
}

export function HealthSignals({ signals }: HealthSignalsProps) {
    if (signals.length === 0) return null;

    const trendConfig = {
        improving: {
            icon: TrendingUp,
            color: "text-success",
            bg: "bg-success/10",
            label: "Improving",
        },
        declining: {
            icon: TrendingDown,
            color: "text-severity-critical",
            bg: "bg-severity-critical/10",
            label: "Declining",
        },
        stable: {
            icon: Minus,
            color: "text-muted-foreground",
            bg: "bg-muted/60",
            label: "Stable",
        },
    };

    return (
        <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">
                Business Health Signals
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {signals.map((signal, i) => {
                    const config = trendConfig[signal.trend];
                    const Icon = config.icon;

                    return (
                        <Card
                            key={signal.name}
                            className="border-border/60 transition-all duration-300 hover:shadow-sm animate-slide-up"
                            style={{ animationDelay: `${i * 60}ms` }}
                        >
                            <CardContent className="pt-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                        {signal.name}
                                    </span>
                                    <div
                                        className={cn(
                                            "flex h-6 w-6 items-center justify-center rounded-md",
                                            config.bg
                                        )}
                                    >
                                        <Icon className={cn("h-3.5 w-3.5", config.color)} />
                                    </div>
                                </div>
                                <p className="text-2xl font-bold tracking-tight text-foreground">
                                    {typeof signal.value === "number"
                                        ? signal.value.toFixed(1) + "%"
                                        : signal.value}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {signal.description}
                                </p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
