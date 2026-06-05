const { Pool } = require("pg");

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://neondb_owner:npg_uzan40Povxwp@ep-tiny-term-ai0m9euo-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  ssl: { rejectUnauthorized: false },
});

(async () => {
  try {
    const total = await pool.query(`SELECT COUNT(*)::int AS total FROM prospects`);
    const byStatus = await pool.query(
      `SELECT status, COUNT(*)::int AS count FROM prospects GROUP BY status ORDER BY count DESC`
    );

    console.log(`\n📊 TOTAL: ${total.rows[0].total} prospect(s)\n`);
    console.log("📋 Répartition par statut:");
    console.table(byStatus.rows);
  } catch (e) {
    console.error("❌", e.message);
  } finally {
    await pool.end();
  }
})();
