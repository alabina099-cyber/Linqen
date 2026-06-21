#!/usr/bin/env node
// =============================================
// Database migration runner — idempotent
// Applique tous les fichiers .sql de db/migrations/ par ordre alphabétique.
// Trace les migrations appliquées dans la table `_migrations`.
// Usage:
//   DATABASE_URL=postgres://... node scripts/migrate.js
//   node scripts/migrate.js  (charge .env.local automatiquement)
// =============================================
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

// Charger .env.local si DATABASE_URL absent (dev local)
if (!process.env.DATABASE_URL) {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, "utf-8")
      .split(/\r?\n/)
      .forEach((line) => {
        const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
      });
    console.log("ℹ️  Chargé DATABASE_URL depuis .env.local");
  }
}

const SCHEMA_FILE = path.join(__dirname, "..", "db", "schema.sql");
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

  // SSL requis pour les DB cloud (Neon, etc.), désactivé pour Postgres local
  // (test en CI sur services: postgres, ou dev local) qui ne supporte pas SSL.
  const dbUrl = process.env.DATABASE_URL;
  const isLocalDb = /@(localhost|127\.0\.0\.1|postgres)[:/]/.test(dbUrl);
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: isLocalDb ? false : { rejectUnauthorized: false }
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

    // Appliquer le schéma de base (idempotent — IF NOT EXISTS) avant les migrations
    if (fs.existsSync(SCHEMA_FILE)) {
      const schemaContent = fs.readFileSync(SCHEMA_FILE, "utf-8");
      const schemaKey = "000_schema.sql";
      const { rows: schemaApplied } = await pool.query(
        "SELECT 1 FROM _migrations WHERE filename = $1",
        [schemaKey]
      );
      if (schemaApplied.length === 0) {
        console.log("▶ Application du schéma de base (schema.sql)...");
        const schemaClient = await pool.connect();
        try {
          await schemaClient.query("BEGIN");
          await schemaClient.query(schemaContent);
          const sum = checksum(schemaContent);
          await schemaClient.query(
            "INSERT INTO _migrations (filename, checksum) VALUES ($1, $2)",
            [schemaKey, sum]
          );
          await schemaClient.query("COMMIT");
          console.log("  ✅ schema.sql appliqué");
        } catch (err) {
          await schemaClient.query("ROLLBACK").catch(() => {});
          console.error("  ❌ Échec schema.sql:", err.message);
          throw err;
        } finally {
          schemaClient.release();
        }
      } else {
        console.log("✓ schema.sql (déjà appliqué)");
      }
    }

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
