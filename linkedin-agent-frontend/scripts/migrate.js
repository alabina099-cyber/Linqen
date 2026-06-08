#!/usr/bin/env node
// =============================================
// Database migration runner — idempotent
// Applique tous les fichiers .sql de db/migrations/ par ordre alphabétique.
// Trace les migrations appliquées dans la table `_migrations`.
// Usage:
//   DATABASE_URL=postgres://... node scripts/migrate.js
// =============================================
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const MIGRATIONS_DIR =
  process.env.MIGRATIONS_DIR ||
  path.join(__dirname, "..", "..", "db", "migrations");

async function ensureMigrationTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      filename VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      checksum VARCHAR(64)
    )
  `);
}

function checksum(content) {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(content).digest("hex");
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL non défini");
    process.exit(1);
  }

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log(
      `ℹ️  Aucun dossier de migrations trouvé (${MIGRATIONS_DIR}) — skip.`
    );
    return;
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("ℹ️  Aucune migration .sql à appliquer.");
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  // Verrou applicatif Postgres pour empêcher 2 runs concurrents
  // (ex : 2 workflows GitHub Actions qui se chevauchent).
  // 4242 = identifiant arbitraire stable.
  const LOCK_KEY = 4242;
  const lockClient = await pool.connect();
  let lockAcquired = false;
  try {
    const { rows } = await lockClient.query(
      "SELECT pg_try_advisory_lock($1) AS got",
      [LOCK_KEY]
    );
    lockAcquired = rows[0]?.got === true;
    if (!lockAcquired) {
      console.error(
        "❌ Une autre migration est déjà en cours (advisory lock détenu). Abort."
      );
      process.exit(2);
    }

    await ensureMigrationTable(pool);

    const { rows: applied } = await pool.query(
      "SELECT filename, checksum FROM _migrations"
    );
    const appliedMap = new Map(applied.map((r) => [r.filename, r.checksum]));

    let count = 0;
    for (const file of files) {
      const fullPath = path.join(MIGRATIONS_DIR, file);
      const content = fs.readFileSync(fullPath, "utf-8");
      const sum = checksum(content);

      if (appliedMap.has(file)) {
        const oldSum = appliedMap.get(file);
        if (oldSum && oldSum !== sum) {
          console.warn(
            `⚠️  ${file} a déjà été appliqué mais son contenu a changé (checksum différent). Skip.`
          );
        } else {
          console.log(`✓ ${file} (déjà appliqué)`);
        }
        continue;
      }

      console.log(`▶ Application de ${file}...`);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(content);
        await client.query(
          "INSERT INTO _migrations (filename, checksum) VALUES ($1, $2)",
          [file, sum]
        );
        await client.query("COMMIT");
        console.log(`  ✅ ${file} appliqué`);
        count++;
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        console.error(`  ❌ Échec de ${file}:`, err.message);
        throw err;
      } finally {
        client.release();
      }
    }

    console.log(
      count === 0
        ? "✅ Toutes les migrations sont déjà à jour."
        : `✅ ${count} migration(s) appliquée(s).`
    );
  } finally {
    if (lockAcquired) {
      await lockClient
        .query("SELECT pg_advisory_unlock($1)", [LOCK_KEY])
        .catch(() => {});
    }
    lockClient.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
