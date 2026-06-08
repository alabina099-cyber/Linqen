const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    const list = await pool.query(
      `SELECT id, name, linkedin_url FROM prospects WHERE status = 'identified'`
    );
    console.log(
      `📊 ${list.rowCount} prospect(s) en statut 'identified' trouvé(s)\n`
    );

    if (list.rowCount === 0) {
      console.log("✅ Rien à supprimer.");
      return;
    }

    list.rows.forEach((p) =>
      console.log(`  #${p.id} - ${p.name} - ${p.linkedin_url}`)
    );

    const ids = list.rows.map((r) => r.id);

    const msgDel = await pool.query(
      `DELETE FROM messages WHERE prospect_id = ANY($1::int[])`,
      [ids]
    );
    console.log(`\n🗑️  ${msgDel.rowCount} message(s) lié(s) supprimé(s)`);

    await pool.query(
      `UPDATE linkedin_actions_queue SET prospect_id = NULL WHERE prospect_id = ANY($1::int[])`,
      [ids]
    );

    const delRes = await pool.query(
      `DELETE FROM prospects WHERE status = 'identified' RETURNING id`
    );
    console.log(`✅ ${delRes.rowCount} prospect(s) 'identified' supprimé(s)`);
  } catch (e) {
    console.error("❌", e.message);
  } finally {
    await pool.end();
  }
})();
