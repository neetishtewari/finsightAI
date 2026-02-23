"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LastUpdated } from "@/components/shared/LastUpdated";
import { InsightCard } from "@/components/insights/InsightCard";
import { IssuesBanner } from "@/components/insights/IssuesBanner";
import { HealthSignals } from "@/components/insights/HealthSignals";
import { QuestionBox } from "@/components/chat/QuestionBox";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Activity,
    Link2,
    Loader2,
    CheckCircle2,
    AlertTriangle,
} from "lucide-react";
import type { AIInsight, Issue, RatioResult } from "@/lib/types";

interface DashboardData {
    connected: boolean;
    companyName: string | null;
    lastSyncedAt: string | null;
    isDataStale: boolean;
    insights: AIInsight[];
    issues: Issue[];
    ratios: RatioResult[];
}

function DashboardContent() {
    const searchParams = useSearchParams();
    const justConnected = searchParams.get("connected") === "true";
    const connectionError = searchParams.get("error");

    const [data, setData] = useState<DashboardData>({
        connected: false,
        companyName: null,
        lastSyncedAt: null,
        isDataStale: false,
        insights: [],
        issues: [],
        ratios: [],
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [syncMessage, setSyncMessage] = useState<string | null>(null);

    // Fetch dashboard data
    const fetchData = useCallback(async () => {
        try {
            const res = await fetch("/api/insights");
            const json = await res.json();
            setData(json);
        } catch (error) {
            console.error("Failed to fetch insights:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Auto-sync after first connection
    useEffect(() => {
        if (justConnected && !isSyncing) {
            handleSync();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [justConnected]);

    // Connect to QuickBooks
    const handleConnect = async () => {
        setIsConnecting(true);
        try {
            const res = await fetch("/api/integrations/quickbooks", {
                method: "POST",
            });
            const { authUrl } = await res.json();
            if (authUrl) {
                window.location.href = authUrl;
            }
        } catch (error) {
            console.error("Connection failed:", error);
            setIsConnecting(false);
        }
    };

    // Sync data
    const handleSync = async () => {
        setIsSyncing(true);
        setSyncMessage("Connecting to QuickBooks...");
        try {
            setSyncMessage("Fetching your financial reports...");
            const res = await fetch("/api/sync", { method: "POST" });
            const json = await res.json();

            if (res.ok) {
                setSyncMessage("Computing insights...");
                await fetchData();
                setSyncMessage(null);
            } else {
                setSyncMessage(json.error || "Sync failed");
                // Clear error after 5 seconds
                setTimeout(() => setSyncMessage(null), 5000);
            }
        } catch (error) {
            console.error("Sync failed:", error);
            setSyncMessage("Sync failed — please try again");
            setTimeout(() => setSyncMessage(null), 5000);
        } finally {
            setIsSyncing(false);
        }
    };

    // ── Loading state ──────────────────────────────────────
    if (isLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="flex flex-col items-center gap-3 animate-fade-in">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">
                        Loading your business health...
                    </p>
                </div>
            </div>
        );
    }

    // ── Not connected — Onboarding prompt ──────────────────
    if (!data.connected) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Card className="max-w-md w-full border-border/60 animate-slide-up">
                    <CardContent className="flex flex-col items-center gap-6 py-10 px-8 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                            <Activity className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-foreground">
                                Connect Your Accounting
                            </h2>
                            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                                Connect your QuickBooks account to get plain-language insights
                                about your business health. We only read your data — never
                                write to it.
                            </p>
                        </div>

                        {connectionError && (
                            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                Connection failed. Please try again.
                            </div>
                        )}

                        <Button
                            size="lg"
                            onClick={handleConnect}
                            disabled={isConnecting}
                            className="w-full gap-2"
                        >
                            {isConnecting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Link2 className="h-4 w-4" />
                            )}
                            Connect QuickBooks
                        </Button>

                        <p className="text-[11px] text-muted-foreground/60">
                            Read-only access · Your data stays private · Disconnect anytime
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ── Connected but no data yet ──────────────────────────
    if (data.connected && data.insights.length === 0 && !isSyncing) {
        return (
            <div className="space-y-8">
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            Business Health
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {data.companyName
                                ? `Connected to ${data.companyName}`
                                : "QuickBooks connected"}
                        </p>
                    </div>
                    <LastUpdated lastSyncedAt={data.lastSyncedAt} />
                </div>

                <Card className="border-primary/20 bg-primary/5 animate-slide-up">
                    <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
                        <CheckCircle2 className="h-10 w-10 text-primary" />
                        <div>
                            <p className="text-sm font-medium text-foreground">
                                QuickBooks connected successfully!
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Sync your data to see insights about your business health.
                            </p>
                        </div>
                        <Button onClick={handleSync} className="gap-2">
                            <Activity className="h-4 w-4" />
                            Sync & Analyze Data
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ── Syncing state ──────────────────────────────────────
    if (isSyncing) {
        return (
            <div className="space-y-8">
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            Business Health
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {data.companyName || "QuickBooks"}
                        </p>
                    </div>
                </div>

                <Card className="border-border/60 animate-slide-up">
                    <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <div>
                            <p className="text-sm font-medium text-foreground">
                                {syncMessage || "Analyzing your data..."}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                This usually takes 10–20 seconds
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ── Full dashboard with real data ──────────────────────
    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        Business Health
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {data.companyName
                            ? `Here's what's happening at ${data.companyName}`
                            : "Here's what's happening in your business right now"}
                    </p>
                </div>
                <LastUpdated
                    lastSyncedAt={data.lastSyncedAt}
                    isStale={data.isDataStale}
                    onRefresh={handleSync}
                    isRefreshing={isSyncing}
                />
            </div>

            {/* Staleness warning banner */}
            {data.isDataStale && (
                <div className="flex items-center gap-2 rounded-lg border border-severity-warning/30 bg-severity-warning/5 px-4 py-3 text-sm text-severity-warning animate-fade-in">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>
                        Your data may be out of date. Last synced:{" "}
                        {data.lastSyncedAt
                            ? new Date(data.lastSyncedAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                            })
                            : "Unknown"}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSync}
                        className="ml-auto"
                    >
                        Refresh Now
                    </Button>
                </div>
            )}

            {/* Issues Requiring Attention */}
            <IssuesBanner issues={data.issues} />

            <Separator className="opacity-50" />

            {/* Health Signals */}
            <HealthSignals signals={data.ratios} />

            <Separator className="opacity-50" />

            {/* Key Insights */}
            <div className="space-y-3">
                <h2 className="text-sm font-semibold text-foreground">Key Insights</h2>
                {data.insights.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                        {data.insights.map((insight, i) => (
                            <InsightCard key={insight.id} insight={insight} index={i} />
                        ))}
                    </div>
                ) : (
                    <Card className="border-border/60">
                        <CardContent className="py-8 text-center text-sm text-muted-foreground">
                            No significant insights to report this period.
                        </CardContent>
                    </Card>
                )}
            </div>

            <Separator className="opacity-50" />

            {/* Question Box */}
            <QuestionBox />
        </div>
    );
}

export default function DashboardPage() {
    return (
        <Suspense
            fallback={
                <div className="flex h-[60vh] items-center justify-center">
                    <div className="flex flex-col items-center gap-3 animate-fade-in">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">
                            Loading your business health...
                        </p>
                    </div>
                </div>
            }
        >
            <DashboardContent />
        </Suspense>
    );
}
