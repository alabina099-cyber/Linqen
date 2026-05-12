import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { z } from "zod";
import { calculateProspectScore } from "@/lib/prospectScore";

// Schema validation
const prospectSchema = z.object({
  linkedin_url: z.string().optional().nullable(),
  name: z.string().min(1, "Nom requis"),
  role: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  company_size: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  status: z.enum(["new", "contacted", "responded", "qualified", "converted", "lost"]).default("new"),
  score: z.number().min(0).max(100).default(0),
  notes: z.string().optional().nullable(),
});

// GET /api/prospects - Liste tous les prospects
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const industry = searchParams.get("industry");
    const location = searchParams.get("location");
    const company_size = searchParams.get("company_size");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let sql = `
      SELECT 
        p.*,
        COUNT(m.id) as message_count,
        MAX(m.created_at) as last_contact
      FROM prospects p
      LEFT JOIN messages m ON p.id = m.prospect_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      sql += ` AND p.status = $${paramCount}`;
      params.push(status);
    }
    if (industry) {
      paramCount++;
      sql += ` AND p.industry ILIKE $${paramCount}`;
      params.push(`%${industry}%`);
    }
    if (location) {
      paramCount++;
      sql += ` AND p.location ILIKE $${paramCount}`;
      params.push(`%${location}%`);
    }
    if (company_size) {
      paramCount++;
      sql += ` AND p.company_size = $${paramCount}`;
      params.push(company_size);
    }
    if (search) {
      paramCount++;
      sql += ` AND (p.name ILIKE $${paramCount} OR p.company ILIKE $${paramCount} OR p.role ILIKE $${paramCount} OR p.email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    sql += ` GROUP BY p.id ORDER BY p.score DESC, p.created_at DESC`;
    
    paramCount++;
    sql += ` LIMIT $${paramCount}`;
    params.push(limit);
    
    paramCount++;
    sql += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await query(sql, params);

    // Get total count for pagination
    const countResult = await query(
      `SELECT COUNT(*) FROM prospects WHERE 1=1${status ? ` AND status = '${status}'` : ""}`,
      []
    );

    return NextResponse.json({
      success: true,
      prospects: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        limit,
        offset,
        hasMore: result.rows.length === limit,
      },
    });
  } catch (error) {
    console.error("GET /api/prospects error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des prospects", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// POST /api/prospects - Créer un prospect
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = prospectSchema.parse(body);

    const sql = `
      INSERT INTO prospects (
        linkedin_url, name, role, company, industry, location, company_size,
        email, phone, status, score, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING *
    `;
    
    // Si le score est explicitement fourni, l'utiliser ; sinon calculer automatiquement
    const computedScore = (body.score !== undefined && body.score !== null)
      ? validated.score
      : calculateProspectScore({
          role: validated.role,
          company: validated.company,
          email: validated.email,
          phone: validated.phone,
          location: validated.location,
          linkedin_url: validated.linkedin_url,
        });

    const params = [
      validated.linkedin_url || null,
      validated.name,
      validated.role || null,
      validated.company || null,
      validated.industry || null,
      validated.location || null,
      validated.company_size || null,
      validated.email || null,
      validated.phone || null,
      validated.status,
      computedScore,
      validated.notes || null,
    ];

    const result = await query(sql, params);

    return NextResponse.json({
      success: true,
      prospect: result.rows[0],
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/prospects error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.format() },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Erreur lors de la création du prospect", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
