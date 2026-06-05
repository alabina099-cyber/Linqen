// =============================================
// Script ponctuel: Supprime tous les prospects en statut 'new'
// Usage: node scripts/delete-new-prospects.js
// =============================================
const { Pool } = require("pg");

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_uzan40Povxwp@ep-tiny-term-ai0m9euo-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();
  try {
    console.log("🔍 Vérification des prospects en statut 'new'...");
    const countRes = await client.query(
      `SELECT COUNT(*)::int AS count FROM prospects WHERE status = 'new'`
    );
    const count = countRes.rows[0].count;
    console.log(`📊 ${count} prospect(s) en statut 'new' trouvé(s)`);

    if (count === 0) {
      console.log("✅ Rien à supprimer. La base est déjà propre.");
      return;
    }

    console.log("🗑️  Suppression en cours...");

    // 1. Supprimer les messages liés aux prospects 'new'
    const msgRes = await client.query(
      `DELETE FROM messages
       WHERE prospect_id IN (SELECT id FROM prospects WHERE status = 'new')
       RETURNING id`
    );
    console.log(`   - ${msgRes.rowCount} message(s) lié(s) supprimé(s)`);

    // 2. Mettre prospect_id à NULL dans linkedin_actions_queue (préserver l'historique)
    const actRes = await client.query(
      `UPDATE linkedin_actions_queue
       SET prospect_id = NULL
       WHERE prospect_id IN (SELECT id FROM prospects WHERE status = 'new')
       RETURNING id`
    );
    console.log(`   - ${actRes.rowCount} action(s) déliée(s) des prospects`);

    // 3. Supprimer les prospects 'new'
    const delRes = await client.query(
      `DELETE FROM prospects WHERE status = 'new'
       RETURNING id, name, linkedin_url`
    );
    console.log(`✅ ${delRes.rowCount} prospect(s) supprimé(s)`);

    if (delRes.rowCount > 0) {
      console.log("\n📋 Liste des prospects supprimés:");
      delRes.rows.forEach((p) => {
        console.log(`   #${p.id} - ${p.name || "(sans nom)"} - ${p.linkedin_url || "(sans URL)"}`);
      });
    }

    // 4. Vérification finale
    const finalRes = await client.query(
      `SELECT COUNT(*)::int AS count FROM prospects WHERE status = 'new'`
    );
    console.log(`\n📊 Vérification finale: ${finalRes.rows[0].count} prospect(s) 'new' restant(s)`);
  } catch (err) {
    console.error("❌ Erreur:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
