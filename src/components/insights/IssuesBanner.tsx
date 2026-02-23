"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Issue } from "@/lib/types";

interface IssuesBannerProps {
    issues: Issue[];
}

export function IssuesBanner({ issues }: IssuesBannerProps) {
    // PRD Rule: Max 3 issues, prioritized by severity then magnitude
    const displayIssues = issues
        .sort((a, b) => {
            const severityOrder = { critical: 0, warning: 1, info: 2 };
            const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
            if (severityDiff !== 0) return severityDiff;
            return b.currentValue - a.currentValue; // Higher magnitude first
        })
        .slice(0, 3);

    // PRD Rule: Empty state positive confirmation
    if (displayIssues.length === 0) {
        return (
            <Card className="border-success/20 bg-success/5">
                <CardContent className="flex items-center gap-3 py-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
                        <ShieldCheck className="h-5 w-5 text-success" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-foreground">
                            Your business health looks stable
                        </p>
                        <p className="text-xs text-muted-foreground">
                            No issues to flag this period
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">
                    Issues Requiring Attention
                </h2>
                <span className="text-xs text-muted-foreground">
                    {displayIssues.length} of {issues.length} shown
                </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {displayIssues.map((issue, i) => (
                    <Card
                        key={issue.id}
                        className={cn(
                            "group relative overflow-hidden border-border/60 transition-all duration-300 hover:shadow-md animate-slide-up",
                            issue.severity === "critical" &&
                            "border-severity-critical/20 hover:border-severity-critical/40",
                            issue.severity === "warning" &&
                            "border-severity-warning/20 hover:border-severity-warning/40",
                            issue.severity === "info" &&
                            "border-severity-info/20 hover:border-severity-info/40"
                        )}
                        style={{ animationDelay: `${i * 100}ms` }}
                    >
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <SeverityBadge severity={issue.severity} size="sm" />
                                {issue.periodsActive > 1 && (
                                    <span className="text-[10px] text-muted-foreground">
                                        {issue.periodsActive} periods
                                    </span>
                                )}
                            </div>
                            <CardTitle className="mt-2 text-sm font-medium leading-snug">
                                {issue.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs leading-relaxed text-muted-foreground">
                                {issue.description}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
