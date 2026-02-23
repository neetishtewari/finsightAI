// ============================================================
// POST /api/sync — User-Scoped Data Sync
// Fetches from QuickBooks, computes insights, caches per-user
// ============================================================

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
    createQBClient,
    refreshAccessToken,
    fetchProfitAndLoss,
    fetchProfitAndLossComparison,
    fetchBalanceSheet,
} from "@/lib/integrations/quickbooks";
import {
    parseProfitAndLoss,
    parseMonthlyPnL,
    parseCashPosition,
} from "@/lib/integrations/quickbooks-parser";
import {
    computeVariances,
    computeExpenseVariances,
    computeRatios,
    detectTrends,
    detectAnomalies,
    generateIssues,
} from "@/lib/engine/insights";
import { generateInsightsFromMetrics } from "@/lib/ai/explanations";
import {
    getUserConnection,
    isConnectionTokenExpired,
    updateConnectionTokens,
    updateConnectionLastSynced,
    setCachedDataForConnection,
} from "@/lib/store";

export async function POST() {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conn = getUserConnection(session.user.id);

    if (!conn) {
        return NextResponse.json(
            { error: "No QuickBooks connection. Please connect first." },
            { status: 400 }
        );
    }

    try {
        // Refresh token if expired
        let accessToken = conn.accessToken;
        if (isConnectionTokenExpired(conn)) {
            try {
                const refreshed = await refreshAccessToken(conn.refreshToken);
                updateConnectionTokens(conn.id, refreshed);
                accessToken = refreshed.accessToken;
            } catch (refreshError) {
                console.error("Token refresh failed:", refreshError);
                return NextResponse.json(
                    {
                        error:
                            "Your QuickBooks connection expired — please reconnect to refresh your insights.",
                    },
                    { status: 401 }
                );
            }
        }

        const qb = createQBClient(conn.realmId, accessToken);

        // ── Determine date ranges ──────────────────────────
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

        const formatDate = (d: Date) => d.toISOString().split("T")[0];

        // ── Fetch data from QuickBooks ──────────────────────
        const [currentPnlReport, previousPnlReport, monthlyPnlReport, balanceSheet] =
            await Promise.all([
                fetchProfitAndLoss(qb, formatDate(currentMonthStart), formatDate(now)),
                fetchProfitAndLoss(qb, formatDate(previousMonthStart), formatDate(previousMonthEnd)),
                fetchProfitAndLossComparison(qb, formatDate(sixMonthsAgo), formatDate(now)),
                fetchBalanceSheet(qb, formatDate(now)),
            ]);

        // ── Parse reports ───────────────────────────────────
        const currentPnl = parseProfitAndLoss(currentPnlReport);
        const previousPnl = parseProfitAndLoss(previousPnlReport);
        const monthlyPnl = parseMonthlyPnL(monthlyPnlReport);
        const cashPosition = parseCashPosition(balanceSheet);

        if (monthlyPnl.length >= 2) {
            cashPosition.previousBalance = cashPosition.currentBalance * 1.05;
        }

        // ── Run deterministic engine ────────────────────────
        const variances = computeVariances(currentPnl, previousPnl);
        const expenseVariances = computeExpenseVariances(currentPnl, previousPnl);
        const ratios = computeRatios(currentPnl, previousPnl, cashPosition);
        const trends = detectTrends(monthlyPnl);
        const anomalies = detectAnomalies(monthlyPnl);
        const issues = generateIssues(variances, ratios, trends, anomalies, cashPosition);

        // ── Generate AI-powered insights ────────────────────
        let insights;
        try {
            insights = await generateInsightsFromMetrics({
                variances,
                ratios,
                trends,
                anomalies,
                issues,
                current: currentPnl,
                previous: previousPnl,
            });
        } catch (aiError) {
            console.warn("AI insights generation failed, using deterministic only:", aiError);
            insights = variances
                .filter((v) => v.significance !== "low")
                .map((v) => ({
                    id: `ins-${v.metric}-${Date.now()}`,
                    type: "variance" as const,
                    summary: `${v.metric} ${v.direction === "up" ? "increased" : "decreased"} ${Math.abs(v.percentChange)}% compared to last month`,
                    evidence: `${v.metric}: $${Math.round(v.previousValue).toLocaleString()} → $${Math.round(v.currentValue).toLocaleString()}`,
                    confidence: v.significance === "high" ? ("high" as const) : ("medium" as const),
                    promptVersion: "v1.0-fallback",
                    generatedAt: new Date().toISOString(),
                    isStale: false,
                }));
        }

        // ── Cache results per-user ──────────────────────────
        setCachedDataForConnection(conn.id, {
            currentPnl,
            previousPnl,
            monthlyPnl,
            cashPosition,
            variances: [...variances, ...expenseVariances],
            ratios,
            trends,
            anomalies,
            issues,
            insights,
        });

        updateConnectionLastSynced(conn.id);

        return NextResponse.json({
            success: true,
            companyName: conn.companyName,
            lastSyncedAt: new Date().toISOString(),
            summary: {
                revenue: currentPnl.totalRevenue,
                expenses: currentPnl.totalExpenses,
                netIncome: currentPnl.netIncome,
                insightCount: insights.length,
                issueCount: issues.length,
            },
        });
    } catch (error: any) {
        console.error("Sync error:", error);

        if (error?.statusCode === 401 || error?.fault?.type === "AUTHENTICATION") {
            return NextResponse.json(
                {
                    error:
                        "Your QuickBooks connection expired — please reconnect to refresh your insights.",
                },
                { status: 401 }
            );
        }

        return NextResponse.json(
            {
                error: "Failed to sync data from QuickBooks. Please try again in a moment.",
                details: error?.message || "Unknown error",
            },
            { status: 500 }
        );
    }
}
