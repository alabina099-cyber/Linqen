const { Pool } = require("pg");

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://neondb_owner:npg_uzan40Povxwp@ep-tiny-term-ai0m9euo-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  ssl: { rejectUnauthorized: false },
});

(async () => {
  try {
    console.log("\n📋 Détail des prospects 'identified':\n");
    const r = await pool.query(
      `SELECT id, name, linkedin_url, role, company, created_at, updated_at
       FROM prospects WHERE status = 'identified' ORDER BY created_at DESC`
    );
    r.rows.forEach((p) => {
      console.log(`#${p.id}`);
      console.log(`  name        : ${p.name || '(NULL)'}`);
      console.log(`  linkedin_url: ${p.linkedin_url || '(NULL)'}`);
      console.log(`  role        : ${p.role || '(NULL)'}`);
      console.log(`  company     : ${p.company || '(NULL)'}`);
      console.log(`  created_at  : ${p.created_at}`);
      console.log(`  updated_at  : ${p.updated_at}`);
      console.log("");
    });

    console.log("\n🔍 Actions linkedin_actions_queue liées (send_connection / search_and_connection):\n");
    const acts = await pool.query(
      `SELECT id, action_type, target_name, target_url, status, prospect_id, created_at
       FROM linkedin_actions_queue
       WHERE action_type IN ('send_connection', 'search_and_connection')
       ORDER BY created_at DESC LIMIT 20`
    );
    console.table(acts.rows);
  } catch (e) {
    console.error("❌", e.message);
  } finally {
    await pool.end();
  }
})();
