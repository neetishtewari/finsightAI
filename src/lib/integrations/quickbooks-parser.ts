// ============================================================
// QuickBooks Report Parser
// Transforms raw QB API report data into our internal types
// ============================================================

import type {
    ProfitAndLoss,
    ExpenseCategory,
    CashPosition,
    RevenueTrend,
    PeriodData,
} from "@/lib/types";
import type { QBReport, QBReportRow } from "@/lib/integrations/quickbooks";

/**
 * Parse a QuickBooks Profit & Loss report into our typed structure.
 */
export function parseProfitAndLoss(report: QBReport): ProfitAndLoss {
    const period: PeriodData = {
        periodStart: report.Header.StartPeriod,
        periodEnd: report.Header.EndPeriod,
        label: formatPeriodLabel(
            report.Header.StartPeriod,
            report.Header.EndPeriod
        ),
    };

    let totalRevenue = 0;
    let totalCogs = 0;
    let grossProfit = 0;
    let totalExpenses = 0;
    let netIncome = 0;
    const expenseCategories: ExpenseCategory[] = [];

    const rows = report.Rows?.Row || [];

    for (const row of rows) {
        const groupName = row.group || "";
        const summaryValue = parseFloat(
            row.Summary?.ColData?.[1]?.value || "0"
        );

        switch (groupName) {
            case "Income":
                totalRevenue = summaryValue;
                break;

            case "COGS":
                totalCogs = summaryValue;
                break;

            case "GrossProfit":
                grossProfit = summaryValue;
                break;

            case "Expenses":
                totalExpenses = summaryValue;
                // Extract individual expense categories
                if (row.Rows?.Row) {
                    for (const expRow of row.Rows.Row) {
                        if (expRow.ColData && expRow.ColData.length >= 2) {
                            const name = expRow.ColData[0]?.value || "Unknown";
                            const amount = parseFloat(expRow.ColData[1]?.value || "0");
                            if (amount !== 0 && name) {
                                expenseCategories.push({ name, amount });
                            }
                        }
                    }
                }
                break;

            case "OtherExpenses":
                // Add other expenses to total
                totalExpenses += summaryValue;
                break;

            case "NetIncome":
            case "NetOperatingIncome":
                netIncome = summaryValue;
                break;
        }
    }

    // If grossProfit wasn't explicitly provided, compute it
    if (grossProfit === 0 && totalRevenue > 0) {
        grossProfit = totalRevenue - totalCogs;
    }

    return {
        period,
        totalRevenue,
        totalCogs,
        grossProfit,
        totalExpenses,
        netIncome,
        expenseCategories: expenseCategories.sort(
            (a, b) => Math.abs(b.amount) - Math.abs(a.amount)
        ),
    };
}

/**
 * Parse a monthly P&L comparison report into multiple periods.
 */
export function parseMonthlyPnL(report: QBReport): ProfitAndLoss[] {
    const columns = report.Columns?.Column || [];
    const rows = report.Rows?.Row || [];
    const periods: ProfitAndLoss[] = [];

    // Each column (after the first label column) is a month
    const monthColumns = columns.slice(1).filter((col) =>
        col.ColTitle && col.ColTitle !== "Total"
    );

    for (let colIdx = 0; colIdx < monthColumns.length; colIdx++) {
        const dataIdx = colIdx + 1; // offset by label column

        let totalRevenue = 0;
        let totalCogs = 0;
        let grossProfit = 0;
        let totalExpenses = 0;
        let netIncome = 0;
        const expenseCategories: ExpenseCategory[] = [];

        for (const row of rows) {
            const groupName = row.group || "";
            const summaryValue = parseFloat(
                row.Summary?.ColData?.[dataIdx]?.value || "0"
            );

            switch (groupName) {
                case "Income":
                    totalRevenue = summaryValue;
                    break;
                case "COGS":
                    totalCogs = summaryValue;
                    break;
                case "GrossProfit":
                    grossProfit = summaryValue;
                    break;
                case "Expenses":
                    totalExpenses = summaryValue;
                    if (row.Rows?.Row) {
                        for (const expRow of row.Rows.Row) {
                            if (expRow.ColData && expRow.ColData.length > dataIdx) {
                                const name = expRow.ColData[0]?.value || "Unknown";
                                const amount = parseFloat(
                                    expRow.ColData[dataIdx]?.value || "0"
                                );
                                if (amount !== 0) {
                                    expenseCategories.push({ name, amount });
                                }
                            }
                        }
                    }
                    break;
                case "NetIncome":
                case "NetOperatingIncome":
                    netIncome = summaryValue;
                    break;
            }
        }

        if (grossProfit === 0 && totalRevenue > 0) {
            grossProfit = totalRevenue - totalCogs;
        }

        const colTitle = monthColumns[colIdx].ColTitle;
        periods.push({
            period: {
                periodStart: colTitle,
                periodEnd: colTitle,
                label: colTitle,
            },
            totalRevenue,
            totalCogs,
            grossProfit,
            totalExpenses,
            netIncome,
            expenseCategories: expenseCategories.sort(
                (a, b) => Math.abs(b.amount) - Math.abs(a.amount)
            ),
        });
    }

    return periods;
}

/**
 * Parse Balance Sheet for cash position.
 */
export function parseCashPosition(report: QBReport): CashPosition {
    let currentBalance = 0;

    const rows = report.Rows?.Row || [];

    for (const row of rows) {
        const groupName = row.group || "";

        // Look for bank accounts or cash section
        if (
            groupName === "Assets" ||
            groupName === "BankAccounts" ||
            groupName === "Bank"
        ) {
            if (row.Rows?.Row) {
                for (const subRow of row.Rows.Row) {
                    // Look for "Bank Accounts" or "Cash and cash equivalents"
                    if (subRow.group === "BankAccounts" || subRow.group === "Bank") {
                        currentBalance = parseFloat(
                            subRow.Summary?.ColData?.[1]?.value || "0"
                        );
                    }
                    // Also check direct rows containing "Bank" or "Cash"
                    if (subRow.ColData) {
                        const label = (subRow.ColData[0]?.value || "").toLowerCase();
                        if (
                            label.includes("bank") ||
                            label.includes("cash") ||
                            label.includes("checking") ||
                            label.includes("savings")
                        ) {
                            currentBalance += parseFloat(
                                subRow.ColData[1]?.value || "0"
                            );
                        }
                    }
                }
            }

            // Fallback: use the summary of Assets if no bank found
            if (currentBalance === 0) {
                currentBalance = parseFloat(
                    row.Summary?.ColData?.[1]?.value || "0"
                );
            }
        }
    }

    return {
        currentBalance,
        previousBalance: 0, // will be set by comparing periods
        asOfDate: report.Header.EndPeriod,
    };
}

// ── Helpers ────────────────────────────────────────────

function formatPeriodLabel(start: string, end: string): string {
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (
        startDate.getMonth() === endDate.getMonth() &&
        startDate.getFullYear() === endDate.getFullYear()
    ) {
        return startDate.toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
        });
    }

    return `${startDate.toLocaleDateString("en-US", {
        month: "short",
    })} – ${endDate.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
    })}`;
}
