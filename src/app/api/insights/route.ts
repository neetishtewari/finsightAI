// ============================================================
// GET /api/insights — User-Scoped
// Returns cached insights for the authenticated user
// ============================================================

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserConnection, getCachedDataForConnection } from "@/lib/store";

export async function GET() {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conn = getUserConnection(session.user.id);

    if (!conn) {
        return NextResponse.json({
            connected: false,
            insights: [],
            issues: [],
            ratios: [],
            trends: [],
            anomalies: [],
            lastSyncedAt: null,
            isDataStale: false,
            companyName: null,
        });
    }

    const data = getCachedDataForConnection(conn.id);

    // Check staleness (>48h per PRD Section 10.2)
    const lastSynced = conn.lastSyncedAt
        ? new Date(conn.lastSyncedAt).getTime()
        : 0;
    const isDataStale =
        lastSynced > 0 && Date.now() - lastSynced > 48 * 60 * 60 * 1000;

    return NextResponse.json({
        connected: true,
        companyName: conn.companyName,
        lastSyncedAt: conn.lastSyncedAt
            ? new Date(conn.lastSyncedAt).toISOString()
            : null,
        isDataStale,
        insights: data?.insights || [],
        issues: data?.issues || [],
        ratios: data?.ratios || [],
        trends: data?.trends || [],
        anomalies: data?.anomalies || [],
        currentPnl: data?.currentPnl
            ? {
                revenue: data.currentPnl.totalRevenue,
                expenses: data.currentPnl.totalExpenses,
                netIncome: data.currentPnl.netIncome,
                grossProfit: data.currentPnl.grossProfit,
                period: data.currentPnl.period,
                expenseCategories: data.currentPnl.expenseCategories,
            }
            : null,
        previousPnl: data?.previousPnl
            ? {
                revenue: data.previousPnl.totalRevenue,
                expenses: data.previousPnl.totalExpenses,
                netIncome: data.previousPnl.netIncome,
            }
            : null,
    });
}
