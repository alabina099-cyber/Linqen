// Script pour initialiser le schéma de la base de données
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_uzan40Povxwp@ep-tiny-term-ai0m9euo-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

async function initSchema() {
  console.log('🔧 Initialisation du schéma de la base de données...');
  
  try {
    await pool.query(`
      -- Table des campagnes
      CREATE TABLE IF NOT EXISTS campaigns (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'draft',
        target VARCHAR(255),
        template VARCHAR(255),
        description TEXT,
        industry VARCHAR(100),
        location VARCHAR(100),
        company_size VARCHAR(50),
        target_role VARCHAR(255),
        template_invitation TEXT,
        template_followup TEXT,
        objective VARCHAR(100),
        seniority TEXT,
        campaign_type VARCHAR(50) DEFAULT 'messages',
        connections_sent INTEGER DEFAULT 0,
        connections_accepted INTEGER DEFAULT 0,
        daily_limit INTEGER DEFAULT 20,
        follow_up_days INTEGER DEFAULT 3,
        contacted INTEGER DEFAULT 0,
        replied INTEGER DEFAULT 0,
        clicked INTEGER DEFAULT 0,
        converted INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table campaigns créée');

    await pool.query(`
      -- Table des messages
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
        prospect_id INTEGER,
        recipient_name VARCHAR(255),
        recipient_role VARCHAR(255),
        recipient_company VARCHAR(255),
        message_text TEXT NOT NULL,
        message_type VARCHAR(50) DEFAULT 'connection',
        status VARCHAR(50) DEFAULT 'sent',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table messages créée');

    await pool.query(`
      -- Table des prospects
      CREATE TABLE IF NOT EXISTS prospects (
        id SERIAL PRIMARY KEY,
        linkedin_url VARCHAR(500) UNIQUE,
        name VARCHAR(255),
        role VARCHAR(255),
        company VARCHAR(255),
        industry VARCHAR(100),
        location VARCHAR(100),
        company_size VARCHAR(50),
        email VARCHAR(255),
        phone VARCHAR(50),
        score INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'identified' CHECK (
          status IN (
            'identified',
            'connected',
            'contacted',
            'responded',
            'interested',
            'converted'
          )
        ),
        notes TEXT,
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table prospects créée');

    await pool.query(`
      -- Table des utilisateurs
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        company VARCHAR(255),
        role VARCHAR(100),
        linkedin_connected BOOLEAN DEFAULT false,
        linkedin_email VARCHAR(255),
        settings JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table users créée');

    await pool.query(`
      -- Table historique de chat agent IA
      CREATE TABLE IF NOT EXISTS agent_chat_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        context JSONB,
        conversation_id VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table agent_chat_history créée');

    await pool.query(`
      -- Table des étapes d'outils agent (tool calls intermédiaires)
      CREATE TABLE IF NOT EXISTS agent_tool_steps (
        id SERIAL PRIMARY KEY,
        conversation_id VARCHAR(36) NOT NULL,
        tool_name VARCHAR(100) NOT NULL,
        args JSONB,
        result TEXT,
        status VARCHAR(20) DEFAULT 'success',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table agent_tool_steps créée');

    await pool.query(`
      -- Table des templates de messages
      CREATE TABLE IF NOT EXISTS templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        tag VARCHAR(100) DEFAULT 'Invitation',
        text TEXT NOT NULL,
        usage_count INTEGER DEFAULT 0,
        conversion_rate INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table templates créée');

    await pool.query(`
      -- Table des notifications
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        read BOOLEAN DEFAULT false,
        data JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table notifications créée');

    await pool.query(`
      -- Table de queue d'actions LinkedIn (communication avec extension Chrome)
      CREATE TABLE IF NOT EXISTS linkedin_actions_queue (
        id SERIAL PRIMARY KEY,
        action_type VARCHAR(50) NOT NULL,
        target_url VARCHAR(500),
        target_name VARCHAR(255),
        payload JSONB DEFAULT '{}',
        status VARCHAR(50) DEFAULT 'pending_approval',
        result JSONB DEFAULT '{}',
        error_message TEXT,
        campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
        prospect_id INTEGER REFERENCES prospects(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        executed_at TIMESTAMP
      );
    `);
    console.log('✅ Table linkedin_actions_queue créée');

    await pool.query(`
      -- Table des follow-ups planifiés
      CREATE TABLE IF NOT EXISTS scheduled_followups (
        id SERIAL PRIMARY KEY,
        prospect_id INTEGER REFERENCES prospects(id) ON DELETE CASCADE,
        campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
        message_text TEXT NOT NULL,
        scheduled_for TIMESTAMP NOT NULL,
        status VARCHAR(50) DEFAULT 'scheduled',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table scheduled_followups créée');

    // Index pour améliorer les performances
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_campaign_id ON messages(campaign_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_prospect_id ON messages(prospect_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_prospects_score ON prospects(score DESC);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_prospects_industry ON prospects(industry);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_agent_chat_user ON agent_chat_history(user_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_templates_tag ON templates(tag);`);
    console.log('✅ Index créés');

    console.log('🎉 Schéma initialisé avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation du schéma:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

initSchema();
