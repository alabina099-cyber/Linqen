const { Pool } = require("pg");

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://neondb_owner:npg_uzan40Povxwp@ep-tiny-term-ai0m9euo-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  ssl: { rejectUnauthorized: false },
});

(async () => {
  try {
    // Détecte les prospects dont linkedin_url ne ressemble PAS à une URL LinkedIn valide
    const malicious = await pool.query(
      `SELECT id, name, linkedin_url FROM prospects
       WHERE linkedin_url IS NULL
          OR linkedin_url !~* '^https?://(www\\.)?linkedin\\.com/'`
    );

    console.log(`🚨 ${malicious.rowCount} prospect(s) avec URL invalide ou malicieuse trouvé(s):\n`);
    malicious.rows.forEach((p) => {
      console.log(`  #${p.id} - name: ${p.name} - url: ${p.linkedin_url}`);
    });

    if (malicious.rowCount === 0) {
      console.log("✅ Aucun prospect à supprimer.");
      return;
    }

    // Supprimer messages liés
    const ids = malicious.rows.map((r) => r.id);
    const msgDel = await pool.query(
      `DELETE FROM messages WHERE prospect_id = ANY($1::int[])`,
      [ids]
    );
    console.log(`\n🗑️  ${msgDel.rowCount} message(s) lié(s) supprimé(s)`);

    const actDel = await pool.query(
      `UPDATE linkedin_actions_queue SET prospect_id = NULL WHERE prospect_id = ANY($1::int[])`,
      [ids]
    );
    console.log(`🗑️  ${actDel.rowCount} action(s) déliée(s)`);

    const delRes = await pool.query(
      `DELETE FROM prospects WHERE id = ANY($1::int[]) RETURNING id, name`,
      [ids]
    );
    console.log(`\n✅ ${delRes.rowCount} prospect(s) malicieux supprimé(s)`);
  } catch (e) {
    console.error("❌", e.message);
  } finally {
    await pool.end();
  }
})();
