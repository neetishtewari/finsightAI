// ============================================================
// QuickBooks Integration API — User-Scoped
// POST → Starts OAuth2 flow
// GET  → Returns current connection status
// DELETE → Disconnects QuickBooks for this user
// ============================================================

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAuthorizationUrl } from "@/lib/integrations/quickbooks";
import { getUserConnection, deleteUserConnection } from "@/lib/store";

export async function GET() {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conn = getUserConnection(session.user.id);

    if (!conn) {
        return NextResponse.json({
            connected: false,
            platform: null,
            companyName: null,
            lastSyncedAt: null,
        });
    }

    return NextResponse.json({
        connected: true,
        platform: conn.platform,
        companyName: conn.companyName,
        lastSyncedAt: conn.lastSyncedAt?.toISOString?.() || conn.lastSyncedAt || null,
        realmId: conn.realmId,
    });
}

export async function POST() {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const authUrl = getAuthorizationUrl(session.user.id);
        return NextResponse.json({ authUrl });
    } catch (error) {
        console.error("QB auth URL error:", error);
        return NextResponse.json(
            { error: "Failed to generate authorization URL" },
            { status: 500 }
        );
    }
}

export async function DELETE() {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    deleteUserConnection(session.user.id);
    return NextResponse.json({ success: true });
}
