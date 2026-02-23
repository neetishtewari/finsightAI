// ============================================================
// AI Explanation Layer — Prompt Templates & Client
// "System computes truth → AI explains meaning"
//
// Governed by PRD Section 8.3:
// - Schema-bound outputs
// - Versioned prompt templates
// - AI must NEVER generate numbers
// - Only interpret provided data
// ============================================================

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import type {
    VarianceResult,
    RatioResult,
    TrendResult,
    AnomalyResult,
    Issue,
    AIInsight,
    ProfitAndLoss,
} from "@/lib/types";

// ── Prompt Version ──────────────────────────────────────

const PROMPT_VERSION = "v1.0";

// ── System Prompt (shared) ──────────────────────────────

const SYSTEM_PROMPT = `You are the Business Health Interpreter — an AI financial intelligence assistant for small business owners.

CORE RULES:
1. NEVER generate, estimate, or fabricate any numbers, dollar figures, or percentages. Only reference the exact figures provided in the data.
2. Speak like a knowledgeable friend, NOT an accountant.
3. Lead with the implication, not the data point.
4. Use active voice: "Your costs went up" not "An increase was observed."
5. Never use financial jargon without explaining it in plain language.
6. Keep responses concise — 2-3 short paragraphs maximum.
7. When referencing financial terms, translate them:
   - Gross Margin → "How much you keep from each sale after direct costs"
   - Net Income → "What's left after all expenses" (say "profit")
   - Burn Rate → "How fast you're spending cash" (say "spending")
   - Cash Runway → "How long your cash will last at current spending"
   - OpEx → "Your regular costs to keep the business running"
   - Accounts Receivable → "Money customers owe you"

FORMATTING:
- Use plain text only, no markdown headers.
- Separate paragraphs with blank lines.
- Use bullet points (•) sparingly, only for lists of 3+ items.`;

// ── Generate Insights from Computed Metrics ─────────────

export async function generateInsightsFromMetrics(data: {
    variances: VarianceResult[];
    ratios: RatioResult[];
    trends: TrendResult[];
    anomalies: AnomalyResult[];
    issues: Issue[];
    current: ProfitAndLoss;
    previous: ProfitAndLoss | null;
}): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];

    // Generate insight for significant variances
    const significantVariances = data.variances.filter(
        (v) => v.significance !== "low" && v.metric !== "Cost of Goods Sold"
    );

    if (significantVariances.length > 0) {
        const prompt = buildVariancePrompt(significantVariances, data.current, data.previous);
        const explanation = await callAI(prompt);

        insights.push({
            id: `ins-var-${Date.now()}`,
            type: "variance",
            summary: getVarianceSummary(significantVariances),
            evidence: buildEvidenceFromVariances(significantVariances),
            confidence: significantVariances.some((v) => v.significance === "high") ? "high" : "medium",
            action: explanation.action,
            promptVersion: PROMPT_VERSION,
            generatedAt: new Date().toISOString(),
            isStale: false,
        });
    }

    // Generate insight for trends
    for (const trend of data.trends.slice(0, 2)) {
        const prompt = buildTrendPrompt(trend, data.ratios);
        const explanation = await callAI(prompt);

        insights.push({
            id: `ins-trend-${trend.metric}-${Date.now()}`,
            type: "trend",
            summary: trend.description,
            evidence: `${trend.metric} has moved ${trend.magnitude}% over ${trend.periods} months.`,
            confidence: trend.periods >= 3 ? "high" : "medium",
            action: explanation.action,
            promptVersion: PROMPT_VERSION,
            generatedAt: new Date().toISOString(),
            isStale: false,
        });
    }

    // Generate insight for anomalies
    for (const anomaly of data.anomalies.slice(0, 2)) {
        insights.push({
            id: `ins-anomaly-${anomaly.metric}-${Date.now()}`,
            type: "anomaly",
            summary: `${anomaly.metric} is unusually ${anomaly.value > (anomaly.expectedRange.min + anomaly.expectedRange.max) / 2 ? "high" : "low"} this period`,
            evidence: anomaly.description,
            confidence: anomaly.severity === "high" ? "high" : "medium",
            action: `Review recent ${anomaly.metric.toLowerCase()} to check if this is a one-time event or a new pattern.`,
            promptVersion: PROMPT_VERSION,
            generatedAt: new Date().toISOString(),
            isStale: false,
        });
    }

    // Health signal insights from ratios
    const decliningRatios = data.ratios.filter((r) => r.trend === "declining");
    if (decliningRatios.length > 0) {
        insights.push({
            id: `ins-health-${Date.now()}`,
            type: "health_signal",
            summary: `${decliningRatios.length} health signal${decliningRatios.length > 1 ? "s" : ""} trending downward`,
            evidence: decliningRatios
                .map((r) => `${r.name}: ${r.value}%${r.previousValue ? ` (was ${r.previousValue}%)` : ""}`)
                .join(". "),
            confidence: "high",
            promptVersion: PROMPT_VERSION,
            generatedAt: new Date().toISOString(),
            isStale: false,
        });
    }

    return insights;
}

// ── Answer User Questions ───────────────────────────────

export async function answerQuestion(
    question: string,
    context: {
        variances: VarianceResult[];
        ratios: RatioResult[];
        trends: TrendResult[];
        anomalies: AnomalyResult[];
        current: ProfitAndLoss;
        previous: ProfitAndLoss | null;
    }
): Promise<string> {
    const contextStr = buildQuestionContext(context);

    const prompt = `A business owner is asking: "${question}"

Here is their current financial data (all numbers are pre-computed and verified — reference them exactly):

${contextStr}

Answer their question using ONLY the data above. If you cannot answer from the available data, say: "I don't have enough information to answer that right now. You can check your QuickBooks reports directly for this detail."

Remember: NEVER generate or estimate numbers. Only use the exact figures provided above.`;

    try {
        const { text } = await generateText({
            model: openai(process.env.AI_MODEL || "gpt-4o-mini"),
            system: SYSTEM_PROMPT,
            prompt,
            maxOutputTokens: 500,
            temperature: 0.3,
        });

        return text;
    } catch (error) {
        console.error("AI question error:", error);
        // PRD: Fall back to template response
        return "I'm having trouble analyzing your data right now. Please try again in a moment, or check your QuickBooks reports directly for this detail.";
    }
}

// ── Private Helpers ─────────────────────────────────────

async function callAI(prompt: string): Promise<{ action?: string }> {
    try {
        const { text } = await generateText({
            model: openai(process.env.AI_MODEL || "gpt-4o-mini"),
            system: SYSTEM_PROMPT,
            prompt,
            maxOutputTokens: 200,
            temperature: 0.2,
        });

        return { action: text.trim() };
    } catch (error) {
        console.error("AI explanation error:", error);
        return { action: undefined };
    }
}

function buildVariancePrompt(
    variances: VarianceResult[],
    current: ProfitAndLoss,
    previous: ProfitAndLoss | null
): string {
    const varianceLines = variances
        .map(
            (v) =>
                `• ${v.metric}: $${Math.round(v.currentValue).toLocaleString()} (${v.direction} ${Math.abs(v.percentChange)}% from $${Math.round(v.previousValue).toLocaleString()})`
        )
        .join("\n");

    return `Based on these metric changes, suggest ONE actionable next step for the business owner (1-2 sentences max):

${varianceLines}

Top expense categories this period:
${current.expenseCategories
            .slice(0, 5)
            .map((c) => `• ${c.name}: $${Math.round(c.amount).toLocaleString()}`)
            .join("\n")}

Only suggest actions using the data above. Do NOT invent numbers.`;
}

function buildTrendPrompt(trend: TrendResult, ratios: RatioResult[]): string {
    return `A business's ${trend.metric} has been ${trend.direction} for ${trend.periods} months (${trend.magnitude}% total change).

Current ratios:
${ratios.map((r) => `• ${r.name}: ${r.value}%`).join("\n")}

Suggest ONE specific, actionable next step (1-2 sentences max). Do NOT generate numbers.`;
}

function buildQuestionContext(context: {
    variances: VarianceResult[];
    ratios: RatioResult[];
    trends: TrendResult[];
    anomalies: AnomalyResult[];
    current: ProfitAndLoss;
    previous: ProfitAndLoss | null;
}): string {
    const parts: string[] = [];

    parts.push("CURRENT PERIOD:");
    parts.push(`Revenue: $${Math.round(context.current.totalRevenue).toLocaleString()}`);
    parts.push(`Gross Profit: $${Math.round(context.current.grossProfit).toLocaleString()}`);
    parts.push(`Total Expenses: $${Math.round(context.current.totalExpenses).toLocaleString()}`);
    parts.push(`Net Income (Profit): $${Math.round(context.current.netIncome).toLocaleString()}`);
    parts.push("");

    if (context.previous) {
        parts.push("PREVIOUS PERIOD:");
        parts.push(`Revenue: $${Math.round(context.previous.totalRevenue).toLocaleString()}`);
        parts.push(`Net Income (Profit): $${Math.round(context.previous.netIncome).toLocaleString()}`);
        parts.push("");
    }

    parts.push("KEY CHANGES:");
    for (const v of context.variances) {
        parts.push(
            `${v.metric}: ${v.direction} ${Math.abs(v.percentChange)}% ($${Math.round(v.previousValue).toLocaleString()} → $${Math.round(v.currentValue).toLocaleString()})`
        );
    }
    parts.push("");

    parts.push("EXPENSE CATEGORIES (this period):");
    for (const c of context.current.expenseCategories.slice(0, 8)) {
        parts.push(`• ${c.name}: $${Math.round(c.amount).toLocaleString()}`);
    }
    parts.push("");

    parts.push("HEALTH RATIOS:");
    for (const r of context.ratios) {
        parts.push(`• ${r.name}: ${r.value}%${r.previousValue ? ` (was ${r.previousValue}%)` : ""} — ${r.description}`);
    }

    if (context.trends.length > 0) {
        parts.push("");
        parts.push("TRENDS:");
        for (const t of context.trends) {
            parts.push(`• ${t.description}`);
        }
    }

    if (context.anomalies.length > 0) {
        parts.push("");
        parts.push("ANOMALIES:");
        for (const a of context.anomalies) {
            parts.push(`• ${a.description}`);
        }
    }

    return parts.join("\n");
}

function getVarianceSummary(variances: VarianceResult[]): string {
    const netIncome = variances.find((v) => v.metric === "Net Income");
    if (netIncome) {
        if (netIncome.direction === "down") {
            return `Your profit dropped ${Math.abs(netIncome.percentChange)}% compared to last month`;
        }
        if (netIncome.direction === "up") {
            return `Your profit increased ${netIncome.percentChange}% compared to last month`;
        }
    }

    const revenue = variances.find((v) => v.metric === "Revenue");
    if (revenue && revenue.direction !== "flat") {
        return `Revenue ${revenue.direction === "up" ? "grew" : "declined"} ${Math.abs(revenue.percentChange)}% this period`;
    }

    return "Several financial metrics changed significantly this period";
}

function buildEvidenceFromVariances(variances: VarianceResult[]): string {
    return variances
        .map(
            (v) =>
                `${v.metric}: $${Math.round(v.previousValue).toLocaleString()} → $${Math.round(v.currentValue).toLocaleString()} (${v.direction === "up" ? "+" : ""}${v.percentChange}%)`
        )
        .join(". ");
}
