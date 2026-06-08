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

  const pool = new Pool({
    connectionString: CONNECTION_STRING,
    ssl: { rejectUnauthorized: false }
  });

  try {
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

      const columns = Object.keys(rows[0]);
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
    console.error("\n❌ Restore failed:", e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

restore(process.argv[2]);
