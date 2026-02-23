// ============================================================
// Deterministic Insight Engine
// "System computes truth → AI explains meaning"
// ============================================================

import type {
    ProfitAndLoss,
    CashPosition,
    VarianceResult,
    RatioResult,
    TrendResult,
    AnomalyResult,
    Issue,
    IssueSeverity,
} from "@/lib/types";

// ── Period Comparisons ─────────────────────────────────

/**
 * Compute variance between two periods for key metrics.
 */
export function computeVariances(
    current: ProfitAndLoss,
    previous: ProfitAndLoss
): VarianceResult[] {
    const metrics = [
        { metric: "Revenue", cur: current.totalRevenue, prev: previous.totalRevenue },
        { metric: "Gross Profit", cur: current.grossProfit, prev: previous.grossProfit },
        { metric: "Total Expenses", cur: current.totalExpenses, prev: previous.totalExpenses },
        { metric: "Net Income", cur: current.netIncome, prev: previous.netIncome },
        { metric: "Cost of Goods Sold", cur: current.totalCogs, prev: previous.totalCogs },
    ];

    return metrics
        .filter((m) => m.prev !== 0 || m.cur !== 0)
        .map((m) => {
            const absoluteChange = m.cur - m.prev;
            const percentChange = m.prev !== 0 ? (absoluteChange / Math.abs(m.prev)) * 100 : 0;
            const absPercent = Math.abs(percentChange);

            return {
                metric: m.metric,
                currentValue: m.cur,
                previousValue: m.prev,
                absoluteChange,
                percentChange: Math.round(percentChange * 10) / 10,
                direction: absoluteChange > 0 ? "up" as const : absoluteChange < 0 ? "down" as const : "flat" as const,
                significance:
                    absPercent > 20 ? ("high" as const) :
                        absPercent > 10 ? ("medium" as const) :
                            ("low" as const),
            };
        });
}

/**
 * Compute expense category variances between two periods.
 */
export function computeExpenseVariances(
    current: ProfitAndLoss,
    previous: ProfitAndLoss
): VarianceResult[] {
    const currentMap = new Map(
        current.expenseCategories.map((c) => [c.name, c.amount])
    );
    const previousMap = new Map(
        previous.expenseCategories.map((c) => [c.name, c.amount])
    );

    const allCategories = new Set([
        ...currentMap.keys(),
        ...previousMap.keys(),
    ]);

    return Array.from(allCategories)
        .map((name) => {
            const cur = currentMap.get(name) || 0;
            const prev = previousMap.get(name) || 0;
            const absoluteChange = cur - prev;
            const percentChange = prev !== 0 ? (absoluteChange / Math.abs(prev)) * 100 : 0;
            const absPercent = Math.abs(percentChange);

            return {
                metric: name,
                currentValue: cur,
                previousValue: prev,
                absoluteChange,
                percentChange: Math.round(percentChange * 10) / 10,
                direction: absoluteChange > 0 ? "up" as const : absoluteChange < 0 ? "down" as const : "flat" as const,
                significance:
                    absPercent > 25 ? ("high" as const) :
                        absPercent > 10 ? ("medium" as const) :
                            ("low" as const),
            };
        })
        .filter((v) => Math.abs(v.percentChange) >= 5) // Only meaningful changes
        .sort((a, b) => Math.abs(b.absoluteChange) - Math.abs(a.absoluteChange));
}

// ── Ratios ──────────────────────────────────────────────

/**
 * Compute key financial ratios.
 */
export function computeRatios(
    current: ProfitAndLoss,
    previous: ProfitAndLoss | null,
    cashPosition?: CashPosition
): RatioResult[] {
    const ratios: RatioResult[] = [];

    // Gross Margin
    const grossMargin =
        current.totalRevenue > 0
            ? (current.grossProfit / current.totalRevenue) * 100
            : 0;
    const prevGrossMargin =
        previous && previous.totalRevenue > 0
            ? (previous.grossProfit / previous.totalRevenue) * 100
            : undefined;

    ratios.push({
        name: "Gross Margin",
        value: Math.round(grossMargin * 10) / 10,
        previousValue: prevGrossMargin
            ? Math.round(prevGrossMargin * 10) / 10
            : undefined,
        trend: getTrend(grossMargin, prevGrossMargin),
        description: "How much you keep from each sale after direct costs",
    });

    // Net Profit Margin
    const netMargin =
        current.totalRevenue > 0
            ? (current.netIncome / current.totalRevenue) * 100
            : 0;
    const prevNetMargin =
        previous && previous.totalRevenue > 0
            ? (previous.netIncome / previous.totalRevenue) * 100
            : undefined;

    ratios.push({
        name: "Profit Margin",
        value: Math.round(netMargin * 10) / 10,
        previousValue: prevNetMargin
            ? Math.round(prevNetMargin * 10) / 10
            : undefined,
        trend: getTrend(netMargin, prevNetMargin),
        description: "What's left after all expenses, as a share of revenue",
    });

    // Expense Ratio
    const expenseRatio =
        current.totalRevenue > 0
            ? (current.totalExpenses / current.totalRevenue) * 100
            : 0;
    const prevExpenseRatio =
        previous && previous.totalRevenue > 0
            ? (previous.totalExpenses / previous.totalRevenue) * 100
            : undefined;

    ratios.push({
        name: "Expense Ratio",
        value: Math.round(expenseRatio * 10) / 10,
        previousValue: prevExpenseRatio
            ? Math.round(prevExpenseRatio * 10) / 10
            : undefined,
        // Lower is better for expense ratio
        trend: prevExpenseRatio
            ? expenseRatio < prevExpenseRatio - 1
                ? "improving"
                : expenseRatio > prevExpenseRatio + 1
                    ? "declining"
                    : "stable"
            : "stable",
        description: "Your regular costs as a share of revenue",
    });

    // Revenue Growth
    if (previous && previous.totalRevenue > 0) {
        const revenueGrowth =
            ((current.totalRevenue - previous.totalRevenue) /
                Math.abs(previous.totalRevenue)) *
            100;

        ratios.push({
            name: "Revenue Growth",
            value: Math.round(revenueGrowth * 10) / 10,
            trend: revenueGrowth > 2 ? "improving" : revenueGrowth < -2 ? "declining" : "stable",
            description: "How this month compares to last month",
        });
    }

    // Cash Runway (if cash data available)
    if (cashPosition && current.totalExpenses > 0) {
        const monthlyBurn = current.totalExpenses - current.totalRevenue;
        const runwayMonths =
            monthlyBurn > 0
                ? cashPosition.currentBalance / monthlyBurn
                : 99; // Not burning cash

        ratios.push({
            name: "Cash Runway",
            value: Math.round(Math.min(runwayMonths, 99) * 10) / 10,
            trend:
                runwayMonths < 3
                    ? "declining"
                    : runwayMonths < 6
                        ? "stable"
                        : "improving",
            description: "Months your cash will last at current spending",
        });
    }

    return ratios;
}

// ── Trend Detection ─────────────────────────────────────

/**
 * Detect trends from multiple periods of data.
 */
export function detectTrends(periods: ProfitAndLoss[]): TrendResult[] {
    if (periods.length < 2) return [];

    const trends: TrendResult[] = [];
    const metrics = ["totalRevenue", "totalExpenses", "netIncome", "grossProfit"] as const;
    const metricLabels: Record<string, string> = {
        totalRevenue: "Revenue",
        totalExpenses: "Expenses",
        netIncome: "Profit",
        grossProfit: "Gross Profit",
    };

    for (const metric of metrics) {
        const values = periods.map((p) => p[metric]);
        const direction = detectDirection(values);

        if (direction !== "stable") {
            const firstVal = values[0];
            const lastVal = values[values.length - 1];
            const magnitude =
                firstVal !== 0
                    ? Math.abs(((lastVal - firstVal) / Math.abs(firstVal)) * 100)
                    : 0;

            trends.push({
                metric: metricLabels[metric],
                direction,
                periods: periods.length,
                magnitude: Math.round(magnitude * 10) / 10,
                description: describeTrend(metricLabels[metric], direction, periods.length, magnitude),
            });
        }
    }

    return trends;
}

// ── Anomaly Detection ───────────────────────────────────

/**
 * Detect anomalies in expense categories (values outside 1.5 IQR).
 */
export function detectAnomalies(
    periods: ProfitAndLoss[]
): AnomalyResult[] {
    if (periods.length < 3) return [];

    const anomalies: AnomalyResult[] = [];
    const latestPeriod = periods[periods.length - 1];
    const historicalPeriods = periods.slice(0, -1);

    // Check each expense category in the latest period
    for (const category of latestPeriod.expenseCategories) {
        const historicalValues = historicalPeriods
            .map((p) => p.expenseCategories.find((c) => c.name === category.name))
            .filter(Boolean)
            .map((c) => c!.amount);

        if (historicalValues.length < 2) continue;

        const mean = historicalValues.reduce((s, v) => s + v, 0) / historicalValues.length;
        const stdDev = Math.sqrt(
            historicalValues.reduce((s, v) => s + Math.pow(v - mean, 2), 0) /
            historicalValues.length
        );

        const upperBound = mean + 1.5 * stdDev;
        const lowerBound = Math.max(0, mean - 1.5 * stdDev);

        if (
            category.amount > upperBound ||
            category.amount < lowerBound
        ) {
            const deviation = Math.abs(
                ((category.amount - mean) / mean) * 100
            );

            anomalies.push({
                metric: category.name,
                value: category.amount,
                expectedRange: {
                    min: Math.round(lowerBound),
                    max: Math.round(upperBound),
                },
                severity:
                    deviation > 50 ? "high" : deviation > 25 ? "medium" : "low",
                description: `${category.name} is ${category.amount > mean ? "higher" : "lower"
                    } than usual. Expected range: $${Math.round(lowerBound).toLocaleString()}–$${Math.round(upperBound).toLocaleString()}, actual: $${Math.round(category.amount).toLocaleString()}.`,
            });
        }
    }

    return anomalies.sort(
        (a, b) =>
            (a.severity === "high" ? 0 : a.severity === "medium" ? 1 : 2) -
            (b.severity === "high" ? 0 : b.severity === "medium" ? 1 : 2)
    );
}

// ── Issues Requiring Attention ──────────────────────────

/**
 * Generate issues requiring attention based on computed metrics.
 * Follows PRD guardrails: severity tiers, display cap, no stacking.
 */
export function generateIssues(
    variances: VarianceResult[],
    ratios: RatioResult[],
    trends: TrendResult[],
    anomalies: AnomalyResult[],
    cashPosition?: CashPosition
): Issue[] {
    const issues: Issue[] = [];
    const rootCauses = new Set<string>(); // PRD: no stacking from same root cause

    // Critical: Cash runway < 3 months
    const cashRunway = ratios.find((r) => r.name === "Cash Runway");
    if (cashRunway && cashRunway.value < 3) {
        issues.push({
            id: "iss-cash-runway",
            severity: "critical",
            title: "Cash runway is getting short",
            description: `At current spending, your cash will last about ${cashRunway.value} months. Consider reducing expenses or increasing revenue.`,
            metric: "cash_runway",
            currentValue: cashRunway.value,
            threshold: 3,
            firstDetectedAt: new Date().toISOString(),
            periodsActive: 1,
        });
        rootCauses.add("cash");
    }

    // Critical: Expenses exceeding revenue
    const revenueVariance = variances.find((v) => v.metric === "Revenue");
    const expenseVariance = variances.find((v) => v.metric === "Total Expenses");
    if (
        revenueVariance &&
        expenseVariance &&
        expenseVariance.percentChange > revenueVariance.percentChange + 5 &&
        !rootCauses.has("expense_revenue")
    ) {
        issues.push({
            id: "iss-expense-revenue",
            severity: expenseVariance.percentChange > revenueVariance.percentChange + 15 ? "critical" : "warning",
            title: "Expenses growing faster than revenue",
            description: `Your costs grew ${expenseVariance.percentChange}% while revenue ${revenueVariance.direction === "up" ? `only grew ${revenueVariance.percentChange}%` : `declined ${Math.abs(revenueVariance.percentChange)}%`
                }. This gap is squeezing your margins.`,
            metric: "expense_to_revenue_ratio",
            currentValue: expenseVariance.percentChange,
            threshold: revenueVariance.percentChange + 5,
            firstDetectedAt: new Date().toISOString(),
            periodsActive: 1,
        });
        rootCauses.add("expense_revenue");
    }

    // Warning: Margin declining for multiple periods
    const marginTrend = trends.find(
        (t) => t.metric === "Gross Profit" && t.direction === "decreasing"
    );
    if (marginTrend && marginTrend.periods >= 2 && !rootCauses.has("margin")) {
        issues.push({
            id: "iss-margin-decline",
            severity: marginTrend.periods >= 3 ? "warning" : "info",
            title: `Profit margin declining for ${marginTrend.periods} months`,
            description: `Your gross profit has been shrinking for ${marginTrend.periods} consecutive months, dropping a total of ${marginTrend.magnitude}%.`,
            metric: "gross_margin_trend",
            currentValue: marginTrend.magnitude,
            firstDetectedAt: new Date().toISOString(),
            periodsActive: marginTrend.periods,
        });
        rootCauses.add("margin");
    }

    // Warning/Info: Significant anomalies in spending
    for (const anomaly of anomalies.slice(0, 2)) {
        // Max 2 anomaly-based issues
        const rootKey = `anomaly-${anomaly.metric}`;
        if (!rootCauses.has(rootKey)) {
            issues.push({
                id: `iss-anomaly-${anomaly.metric.toLowerCase().replace(/\s+/g, "-")}`,
                severity: anomaly.severity === "high" ? "warning" : "info",
                title: `Unusual spending on ${anomaly.metric}`,
                description: anomaly.description,
                metric: `anomaly_${anomaly.metric}`,
                currentValue: anomaly.value,
                firstDetectedAt: new Date().toISOString(),
                periodsActive: 1,
            });
            rootCauses.add(rootKey);
        }
    }

    // Sort by severity → magnitude, cap at 5 (UI caps at 3)
    return issues
        .sort((a, b) => {
            const order: Record<IssueSeverity, number> = { critical: 0, warning: 1, info: 2 };
            return order[a.severity] - order[b.severity] || b.currentValue - a.currentValue;
        })
        .slice(0, 5);
}

// ── Helpers ─────────────────────────────────────────────

function getTrend(
    current: number,
    previous: number | undefined
): "improving" | "declining" | "stable" {
    if (previous === undefined) return "stable";
    const diff = current - previous;
    if (diff > 1) return "improving";
    if (diff < -1) return "declining";
    return "stable";
}

function detectDirection(
    values: number[]
): "increasing" | "decreasing" | "stable" | "volatile" {
    let ups = 0;
    let downs = 0;

    for (let i = 1; i < values.length; i++) {
        const change = values[i] - values[i - 1];
        const threshold = Math.abs(values[i - 1]) * 0.03; // 3% threshold
        if (change > threshold) ups++;
        else if (change < -threshold) downs++;
    }

    const total = values.length - 1;
    if (ups >= total * 0.7) return "increasing";
    if (downs >= total * 0.7) return "decreasing";
    if (ups > 0 && downs > 0 && ups + downs >= total * 0.7) return "volatile";
    return "stable";
}

function describeTrend(
    metric: string,
    direction: string,
    periods: number,
    magnitude: number
): string {
    const dirWord =
        direction === "increasing"
            ? "been growing"
            : direction === "decreasing"
                ? "been declining"
                : "been fluctuating";

    return `${metric} has ${dirWord} over the past ${periods} months (${magnitude}% total change).`;
}
