const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_uzan40Povxwp@ep-tiny-term-ai0m9euo-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS linkedin_actions_queue (
        id SERIAL PRIMARY KEY,
        action_type VARCHAR(50) NOT NULL,
        target_url VARCHAR(500),
        target_name VARCHAR(255),
        payload JSONB DEFAULT '{}',
        status VARCHAR(50) DEFAULT 'pending',
        result JSONB DEFAULT '{}',
        error_message TEXT,
        campaign_id INTEGER,
        prospect_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        executed_at TIMESTAMP
      )
    `);
    console.log('linkedin_actions_queue table created');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS scheduled_followups (
        id SERIAL PRIMARY KEY,
        prospect_id INTEGER,
        campaign_id INTEGER,
        message_text TEXT NOT NULL,
        scheduled_for TIMESTAMP NOT NULL,
        status VARCHAR(50) DEFAULT 'scheduled',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('scheduled_followups table created');

    await pool.query('CREATE INDEX IF NOT EXISTS idx_actions_status ON linkedin_actions_queue(status)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_actions_type ON linkedin_actions_queue(action_type)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_actions_created ON linkedin_actions_queue(created_at)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_followups_scheduled ON scheduled_followups(scheduled_for)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_followups_status ON scheduled_followups(status)');
    console.log('Indexes created');

    // Verify
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('All tables:', tables.rows.map(r => r.table_name).join(', '));

    await pool.end();
    console.log('Done!');
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

run();
