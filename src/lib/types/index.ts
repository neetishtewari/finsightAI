// ============================================================
// Business Health Interpreter — Core Types
// ============================================================

// --- Accounting Integration Types ---

export type AccountingPlatform = "quickbooks" | "xero";

export interface IntegrationConnection {
  id: string;
  userId: string;
  platform: AccountingPlatform;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
  companyId: string;
  companyName: string;
  lastSyncedAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// --- Financial Data Types ---

export interface PeriodData {
  periodStart: string; // ISO date
  periodEnd: string;
  label: string; // e.g., "Jan 2026", "Q1 2026"
}

export interface ProfitAndLoss {
  period: PeriodData;
  totalRevenue: number;
  totalCogs: number;
  grossProfit: number;
  totalExpenses: number;
  netIncome: number;
  expenseCategories: ExpenseCategory[];
}

export interface ExpenseCategory {
  name: string;
  amount: number;
  previousAmount?: number;
  percentChange?: number;
}

export interface CashPosition {
  currentBalance: number;
  previousBalance: number;
  asOfDate: string;
}

export interface RevenueTrend {
  period: PeriodData;
  amount: number;
}

// --- Insight Engine Types ---

export type ComparisonType = "mom" | "qoq"; // Month-over-Month, Quarter-over-Quarter

export interface VarianceResult {
  metric: string;
  currentValue: number;
  previousValue: number;
  absoluteChange: number;
  percentChange: number;
  direction: "up" | "down" | "flat";
  significance: "high" | "medium" | "low";
}

export interface RatioResult {
  name: string;
  value: number;
  previousValue?: number;
  trend: "improving" | "declining" | "stable";
  description: string;
}

export interface TrendResult {
  metric: string;
  direction: "increasing" | "decreasing" | "stable" | "volatile";
  periods: number;
  magnitude: number;
  description: string;
}

export interface AnomalyResult {
  metric: string;
  value: number;
  expectedRange: { min: number; max: number };
  severity: "high" | "medium" | "low";
  description: string;
}

// --- Issues Requiring Attention ---

export type IssueSeverity = "critical" | "warning" | "info";

export interface Issue {
  id: string;
  severity: IssueSeverity;
  title: string;
  description: string;
  metric: string;
  currentValue: number;
  threshold?: number;
  firstDetectedAt: string;
  periodsActive: number;
}

// --- AI Explanation Layer Types ---

export type ConfidenceLevel = "high" | "medium" | "low";

export interface AIInsight {
  id: string;
  type: "variance" | "trend" | "anomaly" | "health_signal" | "issue";
  summary: string;
  evidence: string;
  confidence: ConfidenceLevel;
  action?: string;
  severity?: IssueSeverity;
  promptVersion: string;
  generatedAt: string;
  isStale: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  feedbackGiven?: "positive" | "negative";
  feedbackReason?: string;
}

// --- Feedback Types ---

export type FeedbackType = "positive" | "negative";
export type FeedbackReason =
  | "not_accurate"
  | "not_relevant"
  | "hard_to_understand"
  | "other";

export interface InsightFeedback {
  insightId: string;
  insightType: AIInsight["type"];
  feedback: FeedbackType;
  reason?: FeedbackReason;
  promptVersion: string;
  createdAt: string;
}

// --- Onboarding Types ---

export type OnboardingStep =
  | "welcome"
  | "platform_select"
  | "oauth_connect"
  | "data_sync"
  | "first_run";

export interface OnboardingState {
  currentStep: OnboardingStep;
  selectedPlatform?: AccountingPlatform;
  isConnected: boolean;
  isSyncing: boolean;
  syncProgress: number; // 0-100
  isComplete: boolean;
}

// --- Dashboard State ---

export interface DashboardState {
  insights: AIInsight[];
  issues: Issue[];
  healthSignals: RatioResult[];
  lastSyncedAt: string | null;
  isDataStale: boolean;
  isLoading: boolean;
  error: string | null;
}
