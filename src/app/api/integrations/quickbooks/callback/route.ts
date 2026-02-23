// ============================================================
// GET /api/integrations/quickbooks/callback
//   → OAuth2 callback — exchanges code, stores per-user connection
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import {
    exchangeCodeForTokens,
    createQBClient,
    fetchCompanyInfo,
} from "@/lib/integrations/quickbooks";
import { setUserConnection } from "@/lib/store";

export async function GET(request: NextRequest) {
    const url = request.url;

    try {
        // Parse state to recover userId
        const parsedUrl = new URL(url);
        const state = parsedUrl.searchParams.get("state") || "";
        // state format: "finsightai-{userId}"
        const userId = state.replace("finsightai-", "");

        if (!userId) {
            return NextResponse.redirect(
                new URL("/dashboard?error=invalid_state", request.url)
            );
        }

        // Exchange authorization code for tokens
        const tokens = await exchangeCodeForTokens(url);

        // Fetch company name
        let companyName = "Your Business";
        try {
            const qb = createQBClient(tokens.realmId, tokens.accessToken);
            const companyInfo = await fetchCompanyInfo(qb, tokens.realmId);
            companyName =
                companyInfo?.CompanyInfo?.CompanyName ||
                companyInfo?.QueryResponse?.CompanyInfo?.[0]?.CompanyName ||
                "Your Business";
        } catch (e) {
            console.warn("Could not fetch company name:", e);
        }

        // Store connection for this user
        setUserConnection(userId, {
            realmId: tokens.realmId,
            companyName,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            tokenExpiresAt: tokens.tokenExpiresAt,
            platform: "quickbooks",
        });

        // Redirect to dashboard with success
        return NextResponse.redirect(
            new URL("/dashboard?connected=true", request.url)
        );
    } catch (error) {
        console.error("QB OAuth callback error:", error);
        return NextResponse.redirect(
            new URL("/dashboard?error=connection_failed", request.url)
        );
    }
}
