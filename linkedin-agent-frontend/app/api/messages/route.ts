import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { z } from "zod";

// Schema validation
const messageSchema = z.object({
  prospect_id: z.number().optional(),
  campaign_id: z.number().optional(),
  recipient_name: z.string().min(1, "Nom requis"),
  recipient_role: z.string().nullable().optional(),
  recipient_company: z.string().nullable().optional(),
  message_text: z.string().min(1, "Message requis"),
  message_type: z.enum(["connection", "followup", "response", "template"]).default("connection"),
  status: z.enum(["pending", "sent", "delivered", "read", "replied", "clicked", "converted", "bounced", "failed"]).default("pending"),
});

// GET /api/messages - Liste tous les messages
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const prospect_id = searchParams.get("prospect_id");
    const campaign_id = searchParams.get("campaign_id");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let sql = `
      SELECT m.*,
        p.name as prospect_name,
        p.role as prospect_role,
        p.company as prospect_company,
        c.name as campaign_name
      FROM messages m
      LEFT JOIN prospects p ON m.prospect_id = p.id
      LEFT JOIN campaigns c ON m.campaign_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 0;

    if (prospect_id) {
      paramCount++;
      sql += ` AND m.prospect_id = $${paramCount}`;
      params.push(parseInt(prospect_id));
    }
    if (campaign_id) {
      paramCount++;
      sql += ` AND m.campaign_id = $${paramCount}`;
      params.push(parseInt(campaign_id));
    }
    if (status) {
      paramCount++;
      sql += ` AND m.status = $${paramCount}`;
      params.push(status);
    }

    sql += ` ORDER BY m.created_at DESC`;
    
    paramCount++;
    sql += ` LIMIT $${paramCount}`;
    params.push(limit);
    
    paramCount++;
    sql += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await query(sql, params);

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM messages WHERE 1=1${prospect_id ? ` AND prospect_id = ${prospect_id}` : ""}${campaign_id ? ` AND campaign_id = ${campaign_id}` : ""}${status ? ` AND status = '${status}'` : ""}`,
      []
    );

    return NextResponse.json({
      success: true,
      messages: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        limit,
        offset,
        hasMore: result.rows.length === limit,
      },
    });
  } catch (error) {
    console.error("GET /api/messages error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des messages" },
      { status: 500 }
    );
  }
}

// Auto-migration: ajouter les colonnes manquantes à la table messages
let migrationDone = false;
async function ensureMessageColumns() {
  if (migrationDone) return;
  try {
    await query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(50) DEFAULT 'connection'`);
    await query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS recipient_company VARCHAR(255)`);
    migrationDone = true;
  } catch (e) {
    console.error("Migration messages columns error:", e);
  }
}

// POST /api/messages - Créer un message
export async function POST(request: NextRequest) {
  try {
    await ensureMessageColumns();

    const body = await request.json();
    const validated = messageSchema.parse(body);

    const sql = `
      INSERT INTO messages (
        prospect_id, campaign_id, recipient_name, recipient_role, recipient_company,
        message_text, message_type, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *
    `;
    
    const params = [
      validated.prospect_id || null,
      validated.campaign_id || null,
      validated.recipient_name,
      validated.recipient_role || null,
      validated.recipient_company || null,
      validated.message_text,
      validated.message_type,
      validated.status,
    ];

    const result = await query(sql, params);

    // Update prospect last_contact if prospect_id provided
    if (validated.prospect_id) {
      await query(
        "UPDATE prospects SET updated_at = NOW() WHERE id = $1",
        [validated.prospect_id]
      );
    }

    return NextResponse.json({
      success: true,
      message: result.rows[0],
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/messages error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.format() },
        { status: 400 }
      );
    }
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Erreur lors de la création du message", details: errMsg },
      { status: 500 }
    );
  }
}
