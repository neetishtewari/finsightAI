// ============================================================
// POST /api/auth/signup
// Creates a new user account
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
    try {
        const { name, email, password } = await request.json();

        // Validate input
        if (!name || !email || !password) {
            return NextResponse.json(
                { error: "Name, email, and password are required." },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: "Password must be at least 6 characters." },
                { status: 400 }
            );
        }

        // Check if email already exists
        const existing = db
            .select()
            .from(users)
            .where(eq(users.email, email.toLowerCase()))
            .get();

        if (existing) {
            return NextResponse.json(
                { error: "An account with this email already exists." },
                { status: 409 }
            );
        }

        // Hash password and create user
        const passwordHash = await bcrypt.hash(password, 12);
        const id = randomUUID();

        db.insert(users)
            .values({
                id,
                name: name.trim(),
                email: email.toLowerCase().trim(),
                passwordHash,
            })
            .run();

        return NextResponse.json({
            success: true,
            user: { id, name, email: email.toLowerCase() },
        });
    } catch (error) {
        console.error("Signup error:", error);
        return NextResponse.json(
            { error: "Something went wrong. Please try again." },
            { status: 500 }
        );
    }
}
