import { NextResponse } from "next/server";

/**
 * GET /api/tokens
 *
 * Returns token metadata (name, symbol, description, logo, etc.).
 * Requires database connection — token metadata is stored when creators
 * deploy tokens via the Launchpad.
 *
 * TODO: Connect to database when available.
 */
export async function GET() {
  return NextResponse.json(
    {
      error: "Database not connected",
      message:
        "The tokens endpoint requires a database connection. " +
        "Token metadata (descriptions, logos, social links) is stored in the database when creators deploy tokens.",
      hint: "Start the backend server or configure DATABASE_URL in .env.local",
    },
    { status: 503 },
  );
}
