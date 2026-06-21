// =============================================
// Database Restore Script
// Restaure une sauvegarde générée par backup.js
// Usage: node scripts/restore.js <backup-folder-name>
// =============================================

const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const CONNECTION_STRING = process.env.DATABASE_URL;

if (!CONNECTION_STRING) {
  console.error(
    "❌ DATABASE_URL non défini. Configurez-le via les secrets GitHub ou votre fichier .env."
  );
  process.exit(1);
}

const BACKUP_DIR =
  process.env.BACKUP_DIR || path.join(__dirname, "..", "backups");

async function restore(backupName) {
  if (!backupName) {
    // List available backups
    const backups = fs
      .readdirSync(BACKUP_DIR)
      .filter((d) => d.startsWith("backup-"))
      .sort()
      .reverse();
    console.log("Available backups:");
    backups.forEach((b) => console.log(`  - ${b}`));
    console.log("\nUsage: node scripts/restore.js <backup-folder-name>");
    process.exit(1);
  }

  const backupPath = path.join(BACKUP_DIR, backupName);
  if (!fs.existsSync(backupPath)) {
    console.error(`❌ Backup not found: ${backupPath}`);
    process.exit(1);
  }

  const manifestPath = path.join(backupPath, "_manifest.json");
  if (!fs.existsSync(manifestPath)) {
    console.error("❌ Invalid backup: _manifest.json missing");
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

  console.log("=".repeat(70));
  console.log("LinkedIn Agent — Database Restore");
  console.log("=".repeat(70));
  console.log(`Source: ${backupPath}`);
  console.log(`Backup date: ${manifest.timestamp}`);
  console.log(`Total rows to restore: ${manifest.totalRows}`);
  console.log("=".repeat(70));
  console.log();
  console.log(
    "⚠️  WARNING: This will OVERWRITE existing data in matching tables!"
  );
  console.log("Press Ctrl+C in the next 5 seconds to cancel...");
  await new Promise((r) => setTimeout(r, 5000));

  const isLocalhost =
    CONNECTION_STRING.includes("localhost") ||
    CONNECTION_STRING.includes("127.0.0.1");
  const pool = new Pool({
    connectionString: CONNECTION_STRING,
    ssl: isLocalhost ? false : { rejectUnauthorized: false },
  });

  try {
    // Temporarily disable foreign-key checks so rows can be restored in any order
    // (self-referencing users.admin_id, queue references, etc.).
    await pool.query("SET session_replication_role = 'replica'");

    for (const [table, meta] of Object.entries(manifest.tables)) {
      if (meta.error) {
        console.log(`Skipping ${table} (was not backed up)`);
        continue;
      }
      const filePath = path.join(backupPath, meta.file);
      const rows = JSON.parse(fs.readFileSync(filePath, "utf-8"));

      process.stdout.write(`Restoring ${table} (${rows.length} rows)... `);

      if (rows.length === 0) {
        console.log("empty, skipped");
        continue;
      }

      // Truncate existing data and re-insert
      await pool.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);

      // Ignore backup columns removed in newer migrations
      const allColumns = Object.keys(rows[0]);
      const tableInfo = await pool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
        [table]
      );
      const existingColumns = new Set(tableInfo.rows.map((r) => r.column_name));
      const columns = allColumns.filter((c) => existingColumns.has(c));
      const ignoredColumns = allColumns.filter((c) => !existingColumns.has(c));
      if (ignoredColumns.length > 0) {
        console.log(`ignored obsolete columns: ${ignoredColumns.join(", ")}`);
      }

      const insertSQL = `
        INSERT INTO ${table} (${columns.join(", ")})
        VALUES (${columns.map((_, i) => `$${i + 1}`).join(", ")})
        ON CONFLICT DO NOTHING
      `;

      for (const row of rows) {
        const values = columns.map((c) => {
          const v = row[c];
          // PostgreSQL JSONB columns need stringification
          if (v !== null && typeof v === "object" && !(v instanceof Date)) {
            return JSON.stringify(v);
          }
          return v;
        });
        await pool.query(insertSQL, values);
      }

      console.log("OK");
    }

    console.log();
    console.log("=".repeat(70));
    console.log("✅ Restore completed successfully");
    console.log("=".repeat(70));
  } catch (e) {
    await pool.query("SET session_replication_role = DEFAULT").catch(() => {});
    console.error("\n❌ Restore failed:", e.message);
    process.exit(1);
  } finally {
    await pool.query("SET session_replication_role = DEFAULT").catch(() => {});
    await pool.end();
  }
}

restore(process.argv[2]);
