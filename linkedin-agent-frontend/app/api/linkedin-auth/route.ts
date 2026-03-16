import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

// OPTIONS — CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

// GET — récupérer le statut de la session LinkedIn
export async function GET() {
  try {
    const result = await pool.query(
      `SELECT key, value, updated_at FROM app_settings
       WHERE key IN ('linkedin_session_cookie', 'linkedin_account_email', 'linkedin_account_name', 'linkedin_connected_at', 'linkedin_auth_method')
       ORDER BY key`
    );

    const settings: Record<string, string> = {};
    result.rows.forEach((row) => {
      settings[row.key] = row.value;
    });

    const isConnected = !!settings["linkedin_session_cookie"];

    return NextResponse.json({
      connected: isConnected,
      email: settings["linkedin_account_email"] || null,
      name: settings["linkedin_account_name"] || null,
      auth_method: settings["linkedin_auth_method"] || null,
      connected_at: settings["linkedin_connected_at"] || null,
    });
  } catch (error) {
    // Si la table n'existe pas encore
    return NextResponse.json({ connected: false, email: null, name: null, auth_method: null });
  }
}

// POST — sauvegarder les credentials LinkedIn (cookie ou OAuth)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { method, cookie, email, name } = body;

    if (!method || !["cookie", "oauth"].includes(method)) {
      return NextResponse.json({ error: "Méthode invalide. Utilisez 'cookie' ou 'oauth'." }, { status: 400 });
    }

    if (method === "cookie" && !cookie) {
      return NextResponse.json({ error: "Cookie li_at requis pour la méthode cookie." }, { status: 400 });
    }

    // Créer la table si elle n'existe pas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const upsert = async (key: string, value: string) => {
      await pool.query(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
        [key, value]
      );
    };

    await upsert("linkedin_auth_method", method);
    await upsert("linkedin_connected_at", new Date().toISOString());

    if (method === "cookie" && cookie) {
      await upsert("linkedin_session_cookie", cookie.trim());
    }

    if (email) await upsert("linkedin_account_email", email);
    if (name) await upsert("linkedin_account_name", name);

    return NextResponse.json({
      success: true,
      message: `Compte LinkedIn connecté via ${method === "cookie" ? "cookie" : "OAuth"}.`,
      method,
    });
  } catch (error) {
    console.error("LinkedIn auth POST error:", error);
    return NextResponse.json({ error: "Erreur lors de la sauvegarde des credentials." }, { status: 500 });
  }
}

// DELETE — déconnecter le compte LinkedIn
export async function DELETE() {
  try {
    await pool.query(
      `DELETE FROM app_settings
       WHERE key IN ('linkedin_session_cookie', 'linkedin_account_email', 'linkedin_account_name', 'linkedin_connected_at', 'linkedin_auth_method')`
    );

    return NextResponse.json({ success: true, message: "Compte LinkedIn déconnecté." });
  } catch (error) {
    return NextResponse.json({ error: "Erreur lors de la déconnexion." }, { status: 500 });
  }
}
