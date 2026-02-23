// ============================================================
// User-scoped store operations
// Persists connections and cached data per-user in SQLite
// ============================================================

import { db } from "@/lib/db/client";
import { connections, cachedInsights } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import type {
    ProfitAndLoss,
    CashPosition,
    VarianceResult,
    RatioResult,
    TrendResult,
    AnomalyResult,
    Issue,
    AIInsight,
} from "@/lib/types";

// ── Connection Operations ──────────────────────────────

export function getUserConnection(userId: string) {
    return db
        .select()
        .from(connections)
        .where(and(eq(connections.userId, userId), eq(connections.isActive, true)))
        .get();
}

export function setUserConnection(
    userId: string,
    data: {
        realmId: string;
        companyName: string;
        accessToken: string;
        refreshToken: string;
        tokenExpiresAt: Date;
        platform: "quickbooks" | "xero";
    }
) {
    // Deactivate existing connections for this user
    db.update(connections)
        .set({ isActive: false })
        .where(eq(connections.userId, userId))
        .run();

    // Create new connection
    const id = randomUUID();
    db.insert(connections)
        .values({
            id,
            userId,
            platform: data.platform,
            realmId: data.realmId,
            companyName: data.companyName,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            tokenExpiresAt: data.tokenExpiresAt,
            isActive: true,
        })
        .run();

    return id;
}

export function updateConnectionTokens(
    connectionId: string,
    tokens: {
        accessToken: string;
        refreshToken: string;
        tokenExpiresAt: Date;
    }
) {
    db.update(connections)
        .set({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            tokenExpiresAt: tokens.tokenExpiresAt,
        })
        .where(eq(connections.id, connectionId))
        .run();
}

export function updateConnectionLastSynced(connectionId: string) {
    db.update(connections)
        .set({ lastSyncedAt: new Date() })
        .where(eq(connections.id, connectionId))
        .run();
}

export function deleteUserConnection(userId: string) {
    db.update(connections)
        .set({ isActive: false })
        .where(eq(connections.userId, userId))
        .run();
}

export function isConnectionTokenExpired(conn: { tokenExpiresAt: Date }) {
    return new Date() >= conn.tokenExpiresAt;
}

// ── Cached Data Operations ──────────────────────────────

export interface CachedFinancialData {
    currentPnl: ProfitAndLoss | null;
    previousPnl: ProfitAndLoss | null;
    monthlyPnl: ProfitAndLoss[];
    cashPosition: CashPosition | null;
    variances: VarianceResult[];
    ratios: RatioResult[];
    trends: TrendResult[];
    anomalies: AnomalyResult[];
    issues: Issue[];
    insights: AIInsight[];
}

export function getCachedDataForConnection(
    connectionId: string
): CachedFinancialData | null {
    const cached = db
        .select()
        .from(cachedInsights)
        .where(eq(cachedInsights.connectionId, connectionId))
        .get();

    if (!cached) return null;

    try {
        return JSON.parse(cached.dataJson) as CachedFinancialData;
    } catch {
        return null;
    }
}

export function setCachedDataForConnection(
    connectionId: string,
    data: CachedFinancialData
) {
    const existing = db
        .select()
        .from(cachedInsights)
        .where(eq(cachedInsights.connectionId, connectionId))
        .get();

    const dataJson = JSON.stringify(data);

    if (existing) {
        db.update(cachedInsights)
            .set({ dataJson, computedAt: new Date() })
            .where(eq(cachedInsights.id, existing.id))
            .run();
    } else {
        db.insert(cachedInsights)
            .values({
                id: randomUUID(),
                connectionId,
                dataJson,
            })
            .run();
    }
}
