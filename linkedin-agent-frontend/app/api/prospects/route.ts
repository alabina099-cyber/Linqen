import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { z } from "zod";
import { calculateProspectScore } from "@/lib/prospectScore";
import { ensureOwnershipColumns, getRequestUser, buildScopeClause } from "@/lib/requestAuth";

// Regex pour rejeter les tentatives d'injection HTML / XSS
const SAFE_TEXT = /^[^<>]*$/;
const LINKEDIN_URL_REGEX = /^https?:\/\/(www\.)?linkedin\.com\/[a-zA-Z0-9\-_/?&=%.]+$/i;

// Schema validation — anti XSS/injection
const prospectSchema = z.object({
  linkedin_url: z
    .string()
    .refine((v) => !v || LINKEDIN_URL_REGEX.test(v), "linkedin_url doit être une URL LinkedIn valide")
    .optional()
    .nullable(),
  name: z.string().min(1, "Nom requis").max(255).regex(SAFE_TEXT, "Caractères HTML interdits"),
  role: z.string().max(255).regex(SAFE_TEXT, "Caractères HTML interdits").optional().nullable(),
  company: z.string().max(255).regex(SAFE_TEXT, "Caractères HTML interdits").optional().nullable(),
  industry: z.string().max(100).regex(SAFE_TEXT, "Caractères HTML interdits").optional().nullable(),
  location: z.string().max(100).regex(SAFE_TEXT, "Caractères HTML interdits").optional().nullable(),
  company_size: z.string().max(50).regex(SAFE_TEXT, "Caractères HTML interdits").optional().nullable(),
  email: z.string().email("Email invalide").optional().nullable().or(z.literal("")),
  phone: z.string().max(50).regex(/^[+\d\s()-]*$/, "Téléphone invalide").optional().nullable(),
  status: z.enum(["identified", "connected", "contacted", "responded", "interested", "converted"]).default("identified"),
  score: z.number().min(0).max(100).default(0),
  notes: z.string().max(2000).regex(SAFE_TEXT, "Caractères HTML interdits").optional().nullable(),
});

// GET /api/prospects - Liste les prospects selon le rôle
// User : ses propres prospects — Admin : ceux de toute l'équipe + attribution (owner_name)
export async function GET(request: NextRequest) {
  try {
    await ensureOwnershipColumns();
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const industry = searchParams.get("industry");
    const location = searchParams.get("location");
    const company_size = searchParams.get("company_size");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Clause de scope (isolation par utilisateur)
    const scope = await buildScopeClause(user, "p.user_id", 1);
    const params: any[] = [...scope.params];
    let paramCount = scope.nextIndex - 1;

    let sql = `
      SELECT
        p.*,
        owner.name AS owner_name,
        owner.id AS owner_id,
        COUNT(m.id) as message_count,
        MAX(m.created_at) as last_contact
      FROM prospects p
      LEFT JOIN messages m ON p.id = m.prospect_id
      LEFT JOIN users owner ON owner.id = p.user_id
      WHERE ${scope.clause}
    `;

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

    sql += ` GROUP BY p.id, owner.name, owner.id ORDER BY p.score DESC, p.created_at DESC`;

    paramCount++;
    sql += ` LIMIT $${paramCount}`;
    params.push(limit);

    paramCount++;
    sql += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await query(sql, params);

    // Total count avec le même scope
    const countScope = await buildScopeClause(user, "user_id", 1);
    const countParams: any[] = [...countScope.params];
    let countSql = `SELECT COUNT(*) FROM prospects WHERE ${countScope.clause}`;
    if (status) {
      countSql += ` AND status = $${countScope.nextIndex}`;
      countParams.push(status);
    }
    const countResult = await query(countSql, countParams);

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

// POST /api/prospects - Créer un prospect (associé au créateur)
export async function POST(request: NextRequest) {
  try {
    await ensureOwnershipColumns();
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const validated = prospectSchema.parse(body);

    const sql = `
      INSERT INTO prospects (
        linkedin_url, name, role, company, industry, location, company_size,
        email, phone, status, score, notes, user_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      RETURNING *
    `;

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
      user.userId,
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
