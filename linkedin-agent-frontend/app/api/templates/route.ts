import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { z } from "zod";

// Schema validation
const templateSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  tag: z.string().default("Invitation"),
  text: z.string().min(1, "Texte du template requis"),
  usage_count: z.number().default(0),
  conversion_rate: z.number().default(0),
});

// GET /api/templates - Liste tous les templates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tag = searchParams.get("tag");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let sql = `SELECT * FROM templates WHERE 1=1`;
    const params: any[] = [];
    let paramCount = 0;

    if (tag) {
      paramCount++;
      sql += ` AND tag = $${paramCount}`;
      params.push(tag);
    }

    sql += ` ORDER BY usage_count DESC, created_at DESC`;
    
    paramCount++;
    sql += ` LIMIT $${paramCount}`;
    params.push(limit);
    
    paramCount++;
    sql += ` OFFSET $${paramCount}`;
    params.push(offset);

    const templates = await query(sql, params);

    // Calculer les stats globales
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total,
        COALESCE(SUM(usage_count), 0) as total_usage,
        COALESCE(AVG(conversion_rate), 0) as avg_conversion
      FROM templates
    `);

    const stats = Array.isArray(statsResult) && statsResult.length > 0 
      ? statsResult[0] 
      : { total: 0, total_usage: 0, avg_conversion: 0 };

    return NextResponse.json({
      success: true,
      templates,
      stats
    });
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

// POST /api/templates - Créer un nouveau template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = templateSchema.parse(body);

    const result = await query(
      `INSERT INTO templates (name, tag, text, usage_count, conversion_rate, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [validated.name, validated.tag, validated.text, validated.usage_count, validated.conversion_rate]
    );

    const template = Array.isArray(result) && result.length > 0 ? result[0] : null;

    return NextResponse.json({
      success: true,
      template
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating template:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create template" },
      { status: 500 }
    );
  }
}
