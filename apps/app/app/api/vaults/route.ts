import { NextResponse } from "next/server";

/**
 * GET /api/vaults
 *
 * Returns vault data. Requires database connection to the indexer backend.
 * Vaults are indexed from on-chain deployment events and enriched with metadata.
 *
 * TODO: Connect to database when available.
 */
export async function GET() {
  return NextResponse.json(
    {
      error: "Database not connected",
      message:
        "The vaults endpoint requires a database connection to the indexer backend. " +
        "Vault data is indexed from on-chain deployment events and cannot be read directly from the blockchain in a single call.",
      hint: "Start the backend server or configure DATABASE_URL in .env.local",
    },
    { status: 503 },
  );
}
