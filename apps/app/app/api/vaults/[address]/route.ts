import { NextResponse } from "next/server";

/**
 * GET /api/vaults/:address
 *
 * Returns a single vault by address. Requires database connection.
 *
 * TODO: Connect to database when available.
 */
export async function GET() {
  return NextResponse.json(
    {
      error: "Database not connected",
      message:
        "The vault detail endpoint requires a database connection. " +
        "Individual vault data is stored in the indexer database.",
      hint: "Start the backend server or configure DATABASE_URL in .env.local",
    },
    { status: 503 },
  );
}
