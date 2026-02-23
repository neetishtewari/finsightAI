// ============================================================
// POST /api/chat — User-Scoped
// Answers questions using AI + user's financial context
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { answerQuestion } from "@/lib/ai/explanations";
import { getUserConnection, getCachedDataForConnection } from "@/lib/store";

export async function POST(request: NextRequest) {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conn = getUserConnection(session.user.id);

    if (!conn) {
        return NextResponse.json(
            {
                answer:
                    "Please connect your QuickBooks account first so I can access your financial data.",
            },
            { status: 400 }
        );
    }

    const data = getCachedDataForConnection(conn.id);

    if (!data?.currentPnl) {
        return NextResponse.json(
            {
                answer:
                    "Your data hasn't been synced yet. Please sync your QuickBooks data first.",
            },
            { status: 400 }
        );
    }

    try {
        const { question } = await request.json();

        if (!question || typeof question !== "string") {
            return NextResponse.json(
                { error: "Please provide a question." },
                { status: 400 }
            );
        }

        const answer = await answerQuestion(question, {
            variances: data.variances,
            ratios: data.ratios,
            trends: data.trends,
            anomalies: data.anomalies,
            current: data.currentPnl,
            previous: data.previousPnl,
        });

        // PRD Section 10.2: stale data qualifier
        const lastSynced = conn.lastSyncedAt
            ? new Date(conn.lastSyncedAt).getTime()
            : 0;
        const isStale =
            lastSynced > 0 && Date.now() - lastSynced > 48 * 60 * 60 * 1000;

        const stalePrefix = isStale
            ? `Based on data as of ${new Date(lastSynced).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
            })}:\n\n`
            : "";

        return NextResponse.json({
            answer: stalePrefix + answer,
            isStale,
            lastSyncedAt: conn.lastSyncedAt
                ? new Date(conn.lastSyncedAt).toISOString()
                : null,
        });
    } catch (error) {
        console.error("Chat error:", error);
        return NextResponse.json({
            answer:
                "I'm having trouble analyzing your data right now. Please try again in a moment, or check your QuickBooks reports directly.",
        });
    }
}
