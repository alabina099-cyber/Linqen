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

// POST — sauvegarder les credentials LinkedIn (cookie ou extension)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { method, cookie, email, name } = body;

    if (!method || !["cookie", "extension", "oauth"].includes(method)) {
      return NextResponse.json({ error: "Méthode invalide. Utilisez 'cookie' ou 'extension'." }, { status: 400 });
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

    // Auto-migration : ajouter les colonnes auth si elles n'existent pas encore
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE`);

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

    // === Garantir un admin UNIQUE (mono-admin) puis créer/mettre à jour l'admin ===
    try {
      // 1. Garde-fou : ne conserver qu'un seul admin (le plus ancien).
      //    Les éventuels admins en trop sont rétrogradés en membres rattachés à l'admin conservé.
      const allAdmins = await pool.query(
        "SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC"
      );
      if (allAdmins.rows.length > 1) {
        const keepId = allAdmins.rows[0].id;
        await pool.query(
          `UPDATE users SET role = 'user', admin_id = $1, updated_at = NOW()
           WHERE role = 'admin' AND id <> $1`,
          [keepId]
        );
      }

      // 2. Garde-fou base de données : index unique partiel interdisant 2 admins.
      //    Non-fatal : si des doublons subsistent encore, on log sans bloquer.
      try {
        await pool.query(
          `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_single_admin ON users ((role)) WHERE role = 'admin'`
        );
      } catch (idxError) {
        console.error("Index unique mono-admin non créé (doublons existants ?):", idxError);
      }

      const adminEmail = email || `linkedin-admin-${Date.now()}@local`;
      const adminName = name || "Admin LinkedIn";

      // 3. Un admin existe déjà -> on le réutilise (rebind au nouveau compte LinkedIn).
      //    On ne crée JAMAIS un second admin.
      const currentAdmin = await pool.query(
        "SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1"
      );

      if (currentAdmin.rows.length > 0) {
        await pool.query(
          `UPDATE users SET
             name = COALESCE($1, name),
             email = COALESCE($2, email),
             linkedin_connected = true,
             linkedin_email = $3,
             is_active = true,
             updated_at = NOW()
           WHERE id = $4`,
          [name || null, email || null, email || null, currentAdmin.rows[0].id]
        );
      } else {
        // 4. Aucun admin. Si un utilisateur a déjà cet email, on le promeut ; sinon on crée le 1er admin.
        const existingUser = email
          ? await pool.query("SELECT id FROM users WHERE email = $1", [email])
          : { rows: [] as { id: number }[] };

        if (existingUser.rows.length > 0) {
          await pool.query(
            `UPDATE users SET
               role = 'admin',
               admin_id = NULL,
               linkedin_connected = true,
               linkedin_email = $1,
               is_active = true,
               updated_at = NOW()
             WHERE id = $2`,
            [email || null, existingUser.rows[0].id]
          );
        } else {
          await pool.query(
            `INSERT INTO users (name, email, role, linkedin_connected, linkedin_email, is_active, settings, created_at, updated_at)
             VALUES ($1, $2, 'admin', true, $3, true, '{}', NOW(), NOW())`,
            [adminName, adminEmail, email || null]
          );
        }
      }
    } catch (adminError) {
      console.error("Erreur création/mise à jour admin (non-fatale):", adminError);
    }

    return NextResponse.json({
      success: true,
      message: `Compte LinkedIn connecté via ${method === "cookie" ? "cookie" : "Extension"}.`,
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
