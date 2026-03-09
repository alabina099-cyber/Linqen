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
  recipient_name VARCHAR(255) NOT NULL,
  recipient_role VARCHAR(255),
  recipient_company VARCHAR(255),
  message_text TEXT NOT NULL,
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
  email VARCHAR(255),
  phone VARCHAR(50),
  status VARCHAR(50) DEFAULT 'new',
  notes TEXT,
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

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_messages_campaign_id ON messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);
