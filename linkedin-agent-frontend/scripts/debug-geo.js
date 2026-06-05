// Script de diagnostic pour ProspectMap
const { Pool } = require("pg");

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://neondb_owner:npg_uzan40Povxwp@ep-tiny-term-ai0m9euo-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
});

async function debug() {
  console.log("🔍 Diagnostic ProspectMap...\n");

  // 1. Vérifier le nombre total de prospects
  const total = await pool.query("SELECT COUNT(*) FROM prospects");
  console.log("1. Total prospects:", total.rows[0].count);

  // 2. Vérifier les prospects créés dans les 30 derniers jours
  const recent = await pool.query(`
    SELECT COUNT(*) FROM prospects
    WHERE created_at > NOW() - INTERVAL '30 days'
  `);
  console.log("2. Prospects créés dans les 30 derniers jours:", recent.rows[0].count);

  // 3. Vérifier les prospects créés dans les 60 derniers jours
  const recent60 = await pool.query(`
    SELECT COUNT(*) FROM prospects
    WHERE created_at > NOW() - INTERVAL '60 days'
  `);
  console.log("3. Prospects créés dans les 60 derniers jours:", recent60.rows[0].count);

  // 4. Vérifier la distribution des created_at
  const dates = await pool.query(`
    SELECT
      MIN(created_at) as min_date,
      MAX(created_at) as max_date,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as last_7d,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as last_30d,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '90 days') as last_90d
    FROM prospects
  `);
  console.log("\n4. Distribution temporelle:");
  console.log("   Min date:", dates.rows[0].min_date);
  console.log("   Max date:", dates.rows[0].max_date);
  console.log("   7 derniers jours:", dates.rows[0].last_7d);
  console.log("   30 derniers jours:", dates.rows[0].last_30d);
  console.log("   90 derniers jours:", dates.rows[0].last_90d);

  // 5. Vérifier si des locations sont NULL ou vides
  const locCheck = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE location IS NULL) as null_loc,
      COUNT(*) FILTER (WHERE TRIM(location) = '') as empty_loc
    FROM prospects
  `);
  console.log("\n5. Locations NULL:", locCheck.rows[0].null_loc, "| vides:", locCheck.rows[0].empty_loc);

  // 6. Exécuter la requête exacte de l'API (range=30)
  const geoResult = await pool.query(`
    SELECT
      COALESCE(NULLIF(TRIM(location), ''), 'Inconnu') AS location,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'converted') AS converted,
      ROUND(AVG(score)::numeric, 0) AS avg_score
    FROM prospects
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY location
    ORDER BY total DESC
    LIMIT 25
  `);
  console.log("\n6. Requête API geo (30j):", geoResult.rows.length, "résultats");
  geoResult.rows.slice(0, 5).forEach((r) => {
    console.log(`   ${r.location}: ${r.total} prospects`);
  });

  // 7. Exécuter la requête exacte de l'API (range=60)
  const geo60 = await pool.query(`
    SELECT
      COALESCE(NULLIF(TRIM(location), ''), 'Inconnu') AS location,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'converted') AS converted,
      ROUND(AVG(score)::numeric, 0) AS avg_score
    FROM prospects
    WHERE created_at > NOW() - INTERVAL '60 days'
    GROUP BY location
    ORDER BY total DESC
    LIMIT 25
  `);
  console.log("\n7. Requête API geo (60j):", geo60.rows.length, "résultats");
  geo60.rows.slice(0, 5).forEach((r) => {
    console.log(`   ${r.location}: ${r.total} prospects`);
  });

  // 8. Vérifier la requête industries
  const indResult = await pool.query(`
    SELECT
      COALESCE(NULLIF(TRIM(industry), ''), 'Autre') AS industry,
      COUNT(*) AS total,
      ROUND(AVG(score)::numeric, 0) AS avg_score,
      COUNT(*) FILTER (WHERE status = 'converted') AS converted
    FROM prospects
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY industry
    ORDER BY total DESC
    LIMIT 12
  `);
  console.log("\n8. Requête API industries (30j):", indResult.rows.length, "résultats");

  // 9. Vérifier la requête scores
  const scoreResult = await pool.query(`
    SELECT
      CASE
        WHEN score < 20 THEN '0-20'
        WHEN score < 40 THEN '20-40'
        WHEN score < 60 THEN '40-60'
        WHEN score < 80 THEN '60-80'
        ELSE '80-100'
      END AS bucket,
      COUNT(*) AS count,
      COUNT(*) FILTER (WHERE status = 'converted') AS converted
    FROM prospects
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY bucket
    ORDER BY
      CASE bucket
        WHEN '0-20' THEN 1
        WHEN '20-40' THEN 2
        WHEN '40-60' THEN 3
        WHEN '60-80' THEN 4
        ELSE 5
      END
  `);
  console.log("9. Requête API scores (30j):", scoreResult.rows.length, "résultats");

  // 10. Vérifier la requête ICP
  const icpResult = await pool.query(`
    SELECT
      p.id, p.name, p.company, p.score, p.status,
      COALESCE((
        SELECT COUNT(*) FROM messages m WHERE m.prospect_id = p.id
      ), 0) AS engagement
    FROM prospects p
    WHERE p.created_at > NOW() - INTERVAL '30 days'
    ORDER BY p.score DESC
    LIMIT 200
  `);
  console.log("10. Requête API ICP (30j):", icpResult.rows.length, "résultats");

  await pool.end();
}

debug().catch(console.error);
