// ============================================================
// Database Schema (SQLite + Drizzle ORM)
// Multi-tenant: Users, Sessions, QuickBooks Connections, Cached Data
// ============================================================

import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// ── Users ──────────────────────────────────────────────

export const users = sqliteTable("users", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .$defaultFn(() => new Date()),
});

// ── Sessions ───────────────────────────────────────────

export const sessions = sqliteTable("sessions", {
    id: text("id").primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
});

// ── QuickBooks Connections (per user) ──────────────────

export const connections = sqliteTable("connections", {
    id: text("id").primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    platform: text("platform").notNull().$type<"quickbooks" | "xero">(),
    realmId: text("realm_id").notNull(),
    companyName: text("company_name").notNull(),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token").notNull(),
    tokenExpiresAt: integer("token_expires_at", { mode: "timestamp" }).notNull(),
    lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .$defaultFn(() => new Date()),
});

// ── Cached Financial Data (per connection) ─────────────

export const cachedInsights = sqliteTable("cached_insights", {
    id: text("id").primaryKey(),
    connectionId: text("connection_id")
        .notNull()
        .references(() => connections.id, { onDelete: "cascade" }),
    dataJson: text("data_json").notNull(), // JSON-stringified financial data
    computedAt: integer("computed_at", { mode: "timestamp" })
        .notNull()
        .$defaultFn(() => new Date()),
});

// ── Feedback Logs ──────────────────────────────────────

export const feedbackLogs = sqliteTable("feedback_logs", {
    id: text("id").primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    insightId: text("insight_id").notNull(),
    insightType: text("insight_type").notNull(),
    feedback: text("feedback").notNull().$type<"positive" | "negative">(),
    reason: text("reason"),
    promptVersion: text("prompt_version"),
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .$defaultFn(() => new Date()),
});
