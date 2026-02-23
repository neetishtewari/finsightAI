// ============================================================
// QuickBooks OAuth2 & API Client
// ============================================================

import OAuthClient from "intuit-oauth";
import QuickBooks from "node-quickbooks";

// Singleton OAuth client
let oauthClient: OAuthClient | null = null;

export function getOAuthClient(): OAuthClient {
    if (!oauthClient) {
        oauthClient = new OAuthClient({
            clientId: process.env.QUICKBOOKS_CLIENT_ID!,
            clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET!,
            environment:
                process.env.QUICKBOOKS_ENVIRONMENT === "production"
                    ? "production"
                    : "sandbox",
            redirectUri: process.env.QUICKBOOKS_REDIRECT_URI!,
        });
    }
    return oauthClient;
}

/**
 * Generate the QuickBooks OAuth2 authorization URL.
 * The userId is embedded in the state parameter for the callback.
 */
export function getAuthorizationUrl(userId: string): string {
    const client = getOAuthClient();
    return client.authorizeUri({
        scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.OpenId],
        state: `finsightai-${userId}`,
    });
}

/**
 * Exchange authorization code for tokens.
 */
export async function exchangeCodeForTokens(
    url: string
): Promise<{
    accessToken: string;
    refreshToken: string;
    tokenExpiresAt: Date;
    realmId: string;
}> {
    const client = getOAuthClient();
    const authResponse = await client.createToken(url);
    const token = authResponse.getJson();

    return {
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        tokenExpiresAt: new Date(
            Date.now() + (token.expires_in || 3600) * 1000
        ),
        realmId: token.realmId || (client as any).getToken()?.realmId || "",
    };
}

/**
 * Refresh an expired access token.
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    tokenExpiresAt: Date;
}> {
    const client = getOAuthClient();
    const authResponse = await client.refreshUsingToken(refreshToken);
    const token = authResponse.getJson();

    return {
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        tokenExpiresAt: new Date(
            Date.now() + (token.expires_in || 3600) * 1000
        ),
    };
}

/**
 * Create a QuickBooks API client instance.
 */
export function createQBClient(
    realmId: string,
    accessToken: string
): QuickBooks {
    const isSandbox = process.env.QUICKBOOKS_ENVIRONMENT !== "production";

    return new QuickBooks(
        process.env.QUICKBOOKS_CLIENT_ID!,
        process.env.QUICKBOOKS_CLIENT_SECRET!,
        accessToken,
        false, // no token secret for OAuth2
        realmId,
        isSandbox, // use sandbox
        true, // debug
        null, // minor version
        "2.0", // OAuth version
        null // refresh token (handled separately)
    );
}

// ============================================================
// Data Fetching — Reports & Financial Data
// ============================================================

export interface QBReportRow {
    ColData: Array<{ value: string; id?: string }>;
    Rows?: { Row: QBReportRow[] };
    Header?: { ColData: Array<{ value: string }> };
    type?: string;
    group?: string;
    Summary?: { ColData: Array<{ value: string }> };
}

export interface QBReport {
    Header: {
        Time: string;
        ReportName: string;
        ReportBasis: string;
        StartPeriod: string;
        EndPeriod: string;
        Currency: string;
    };
    Columns: {
        Column: Array<{ ColTitle: string; ColType: string }>;
    };
    Rows: {
        Row: QBReportRow[];
    };
}

/**
 * Fetch Profit & Loss report for a given date range.
 */
export function fetchProfitAndLoss(
    qb: QuickBooks,
    startDate: string,
    endDate: string
): Promise<QBReport> {
    return new Promise((resolve, reject) => {
        qb.reportProfitAndLoss(
            {
                start_date: startDate,
                end_date: endDate,
                accounting_method: "Accrual",
            },
            (err: any, report: QBReport) => {
                if (err) reject(err);
                else resolve(report);
            }
        );
    });
}

/**
 * Fetch Profit & Loss detail with comparison to previous period.
 */
export function fetchProfitAndLossComparison(
    qb: QuickBooks,
    startDate: string,
    endDate: string
): Promise<QBReport> {
    return new Promise((resolve, reject) => {
        qb.reportProfitAndLoss(
            {
                start_date: startDate,
                end_date: endDate,
                accounting_method: "Accrual",
                date_macro: undefined,
                summarize_column_by: "Month",
            },
            (err: any, report: QBReport) => {
                if (err) reject(err);
                else resolve(report);
            }
        );
    });
}

/**
 * Fetch Balance Sheet for cash position.
 */
export function fetchBalanceSheet(
    qb: QuickBooks,
    asOfDate: string
): Promise<QBReport> {
    return new Promise((resolve, reject) => {
        qb.reportBalanceSheet(
            {
                date_macro: undefined,
                start_date: asOfDate,
                end_date: asOfDate,
                accounting_method: "Accrual",
            },
            (err: any, report: QBReport) => {
                if (err) reject(err);
                else resolve(report);
            }
        );
    });
}

/**
 * Get the company info (name, etc.).
 */
export function fetchCompanyInfo(
    qb: QuickBooks,
    realmId: string
): Promise<any> {
    return new Promise((resolve, reject) => {
        qb.getCompanyInfo(realmId, (err: any, data: any) => {
            if (err) reject(err);
            else resolve(data);
        });
    });
}
