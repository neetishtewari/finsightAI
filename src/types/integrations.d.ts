declare module "intuit-oauth" {
    interface OAuthClientConfig {
        clientId: string;
        clientSecret: string;
        environment: "sandbox" | "production";
        redirectUri: string;
    }

    interface AuthorizeUriOptions {
        scope: string[];
        state?: string;
    }

    interface TokenResponse {
        getJson(): {
            access_token: string;
            refresh_token: string;
            expires_in: number;
            realmId?: string;
            token_type: string;
        };
    }

    class OAuthClient {
        constructor(config: OAuthClientConfig);
        authorizeUri(options: AuthorizeUriOptions): string;
        createToken(url: string): Promise<TokenResponse>;
        refreshUsingToken(refreshToken: string): Promise<TokenResponse>;
        getToken(): any;
        static scopes: {
            Accounting: string;
            Payment: string;
            OpenId: string;
            Profile: string;
            Email: string;
            Phone: string;
            Address: string;
        };
    }

    export = OAuthClient;
}

declare module "node-quickbooks" {
    class QuickBooks {
        constructor(
            clientId: string,
            clientSecret: string,
            accessToken: string,
            noTokenSecret: boolean,
            realmId: string,
            useSandbox: boolean,
            debug: boolean,
            minorVersion: string | null,
            oAuthVersion: string,
            refreshToken: string | null
        );

        reportProfitAndLoss(options: Record<string, any>, callback: (err: any, data: any) => void): void;
        reportBalanceSheet(options: Record<string, any>, callback: (err: any, data: any) => void): void;
        getCompanyInfo(realmId: string, callback: (err: any, data: any) => void): void;
    }

    export = QuickBooks;
}
