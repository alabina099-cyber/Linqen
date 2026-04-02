-- Schema de base de données pour LinkedIn Agent
-- Exécuter ce script dans Neon DB pour créer les tables
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
  daily_limit INTEGER DEFAULT 20,
  follow_up_days INTEGER DEFAULT 3,
  contacted INTEGER DEFAULT 0,
  replied INTEGER DEFAULT 0,
  clicked INTEGER DEFAULT 0,
  converted INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
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
  score INTEGER DEFAULT 50,
  status VARCHAR(50) DEFAULT 'new',
  notes TEXT,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
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
-- Table des notifications
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  -- 'message', 'reply', 'conversion', 'connection'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Table de queue d'actions LinkedIn (communication avec extension Chrome)
CREATE TABLE IF NOT EXISTS linkedin_actions_queue (
  id SERIAL PRIMARY KEY,
  action_type VARCHAR(50) NOT NULL,
  -- 'search', 'visit_profile', 'send_connection', 'send_message'
  target_url VARCHAR(500),
  target_name VARCHAR(255),
  payload JSONB DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'pending_approval',
  -- 'pending_approval', 'processing', 'completed', 'failed'
  result JSONB DEFAULT '{}',
  error_message TEXT,
  campaign_id INTEGER REFERENCES campaigns(id) ON DELETE
  SET NULL,
    prospect_id INTEGER REFERENCES prospects(id) ON DELETE
  SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    executed_at TIMESTAMP
);
-- Table des follow-ups planifiés
CREATE TABLE IF NOT EXISTS scheduled_followups (
  id SERIAL PRIMARY KEY,
  prospect_id INTEGER REFERENCES prospects(id) ON DELETE CASCADE,
  campaign_id INTEGER REFERENCES campaigns(id) ON DELETE
  SET NULL,
    message_text TEXT NOT NULL,
    scheduled_for TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'scheduled',
    -- 'scheduled', 'sent', 'cancelled'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_messages_campaign_id ON messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_messages_prospect_id ON messages(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_score ON prospects(score DESC);
CREATE INDEX IF NOT EXISTS idx_prospects_industry ON prospects(industry);
CREATE INDEX IF NOT EXISTS idx_agent_chat_user ON agent_chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_tag ON templates(tag);