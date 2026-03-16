import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { z } from "zod";

// Schema validation
const userSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  email: z.string().email("Email invalide"),
  company: z.string().optional(),
  role: z.string().optional(),
  linkedin_connected: z.boolean().default(false),
  linkedin_email: z.string().email().optional().or(z.literal("")),
  settings: z.record(z.string(), z.unknown()).optional(),
});

// GET /api/users/me - Récupérer l'utilisateur courant (simulé pour l'instant)
export async function GET(request: NextRequest) {
  try {
    // Pour l'instant, retourner le premier utilisateur ou créer un utilisateur par défaut
    let result = await query("SELECT * FROM users LIMIT 1");
    
    if (result.rows.length === 0) {
      // Créer un utilisateur par défaut
      result = await query(
        `INSERT INTO users (name, email, company, role, settings, created_at, updated_at)
         VALUES ('Dorra Boucharbia', 'dorraboucharbia@gmail.com', 'LinkedIn Agent', 'Admin', '{}', NOW(), NOW())
         RETURNING *`
      );
    }

    return NextResponse.json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.error("GET /api/users/me error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'utilisateur" },
      { status: 500 }
    );
  }
}

// PUT /api/users/me - Mettre à jour l'utilisateur courant
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = userSchema.partial().parse(body);

    // Récupérer l'utilisateur actuel
    const currentUser = await query("SELECT id FROM users LIMIT 1");
    
    if (currentUser.rows.length === 0) {
      // Créer l'utilisateur s'il n'existe pas
      const createResult = await query(
        `INSERT INTO users (name, email, company, role, linkedin_connected, linkedin_email, settings, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         RETURNING *`,
        [
          validated.name || 'Utilisateur',
          validated.email || 'user@example.com',
          validated.company || null,
          validated.role || null,
          validated.linkedin_connected || false,
          validated.linkedin_email || null,
          JSON.stringify(validated.settings || {}),
        ]
      );
      
      return NextResponse.json({
        success: true,
        user: createResult.rows[0],
      });
    }

    const userId = currentUser.rows[0].id;

    // Construire la requête UPDATE dynamique
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    Object.entries(validated).forEach(([key, value]) => {
      if (value !== undefined) {
        paramCount++;
        if (key === 'settings') {
          updates.push(`${key} = $${paramCount}::jsonb`);
        } else {
          updates.push(`${key} = $${paramCount}`);
        }
        values.push(value);
      }
    });

    if (updates.length === 0) {
      return NextResponse.json({ error: "Aucune donnée à mettre à jour" }, { status: 400 });
    }

    paramCount++;
    updates.push(`updated_at = NOW()`);
    values.push(userId);

    const sql = `UPDATE users SET ${updates.join(", ")} WHERE id = $${paramCount} RETURNING *`;
    const result = await query(sql, values);

    return NextResponse.json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.error("PUT /api/users/me error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.format() },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de l'utilisateur" },
      { status: 500 }
    );
  }
}
