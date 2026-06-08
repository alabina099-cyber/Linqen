// =============================================
// Automated Backup Script
// Exporte toutes les tables en JSON pour sauvegarde
// Usage: node scripts/backup.js
// Schedule: configurer un cron pour exécution quotidienne
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
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || "30");

const TABLES = [
  "users",
  "campaigns",
  "prospects",
  "messages",
  "templates",
  "notifications",
  "linkedin_actions_queue",
  "scheduled_followups",
  "agent_chat_history"
];

async function backup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupSubdir = path.join(BACKUP_DIR, `backup-${timestamp}`);

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  fs.mkdirSync(backupSubdir, { recursive: true });

  console.log("=".repeat(70));
  console.log("LinkedIn Agent — Database Backup");
  console.log("=".repeat(70));
  console.log(`Output: ${backupSubdir}`);
  console.log();

  const pool = new Pool({
    connectionString: CONNECTION_STRING,
    ssl: { rejectUnauthorized: false }
  });

  const manifest = {
    timestamp: new Date().toISOString(),
    tables: {},
    totalRows: 0
  };

  try {
    for (const table of TABLES) {
      process.stdout.write(`Backing up ${table}... `);
      try {
        const result = await pool.query(`SELECT * FROM ${table}`);
        const filePath = path.join(backupSubdir, `${table}.json`);
        fs.writeFileSync(
          filePath,
          JSON.stringify(result.rows, null, 2),
          "utf-8"
        );
        manifest.tables[table] = {
          rows: result.rows.length,
          file: `${table}.json`,
          size: fs.statSync(filePath).size
        };
        manifest.totalRows += result.rows.length;
        console.log(`${result.rows.length} rows`);
      } catch (e) {
        console.log(`SKIPPED (${e.message})`);
        manifest.tables[table] = { error: e.message };
      }
    }

    // Save schema (column info)
    const schemaResult = await pool.query(`
      SELECT table_name, column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);
    fs.writeFileSync(
      path.join(backupSubdir, "_schema.json"),
      JSON.stringify(schemaResult.rows, null, 2),
      "utf-8"
    );

    fs.writeFileSync(
      path.join(backupSubdir, "_manifest.json"),
      JSON.stringify(manifest, null, 2),
      "utf-8"
    );

    console.log();
    console.log("=".repeat(70));
    console.log(`✅ Backup completed: ${manifest.totalRows} rows total`);
    console.log("=".repeat(70));

    // Cleanup old backups
    cleanupOldBackups();
  } catch (e) {
    console.error("\n❌ Backup failed:", e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

function cleanupOldBackups() {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const dirs = fs
    .readdirSync(BACKUP_DIR)
    .filter((d) => d.startsWith("backup-"))
    .map((d) => ({
      name: d,
      path: path.join(BACKUP_DIR, d),
      mtime: fs.statSync(path.join(BACKUP_DIR, d)).mtimeMs
    }))
    .filter((d) => d.mtime < cutoff);

  if (dirs.length > 0) {
    console.log(
      `\nCleaning up ${dirs.length} backup(s) older than ${RETENTION_DAYS} days...`
    );
    for (const d of dirs) {
      fs.rmSync(d.path, { recursive: true, force: true });
      console.log(`  Removed: ${d.name}`);
    }
  }
}

backup();
