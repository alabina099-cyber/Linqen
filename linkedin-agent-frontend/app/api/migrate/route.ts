import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// POST /api/migrate - Run pending migrations
export async function POST() {
  const results: string[] = [];
  
  try {
    // Add prospect_id column to messages if missing
    try {
      await query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS prospect_id INTEGER`, []);
      results.push("Added prospect_id to messages");
    } catch (e: any) {
      if (e.message?.includes("already exists")) {
        results.push("prospect_id already exists in messages");
      } else {
        results.push(`prospect_id error: ${e.message}`);
      }
    }

    // Add company_size column to prospects if missing
    try {
      await query(`ALTER TABLE prospects ADD COLUMN IF NOT EXISTS company_size VARCHAR(50)`, []);
      results.push("Added company_size to prospects");
    } catch (e: any) {
      if (e.message?.includes("already exists")) {
        results.push("company_size already exists");
      } else {
        results.push(`company_size error: ${e.message}`);
      }
    }

    // Add linkedin_url column to prospects if missing
    try {
      await query(`ALTER TABLE prospects ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(500)`, []);
      results.push("Added linkedin_url to prospects");
    } catch (e: any) {
      if (e.message?.includes("already exists")) {
        results.push("linkedin_url already exists");
      } else {
        results.push(`linkedin_url error: ${e.message}`);
      }
    }

    // Add notes column to prospects if missing
    try {
      await query(`ALTER TABLE prospects ADD COLUMN IF NOT EXISTS notes TEXT`, []);
      results.push("Added notes to prospects");
    } catch (e: any) {
      if (e.message?.includes("already exists")) {
        results.push("notes already exists");
      } else {
        results.push(`notes error: ${e.message}`);
      }
    }

    // Add score column to prospects if missing
    try {
      await query(`ALTER TABLE prospects ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 50`, []);
      results.push("Added score to prospects");
    } catch (e: any) {
      if (e.message?.includes("already exists")) {
        results.push("score already exists");
      } else {
        results.push(`score error: ${e.message}`);
      }
    }

    // Add last_seen column to prospects if missing
    try {
      await query(`ALTER TABLE prospects ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP`, []);
      results.push("Added last_seen to prospects");
    } catch (e: any) {
      if (e.message?.includes("already exists")) {
        results.push("last_seen already exists");
      } else {
        results.push(`last_seen error: ${e.message}`);
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { error: "Migration failed", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
