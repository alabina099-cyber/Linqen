-- =============================================
-- Migration 001 : Ajout du support workers cloud
-- =============================================
-- Cette migration ajoute les colonnes nécessaires pour que les workers
-- conteneurisés puissent récupérer et verrouiller les actions de la file d'attente.

-- 1. Colonnes de claim (verrouillage par worker)
ALTER TABLE linkedin_actions_queue
ADD COLUMN IF NOT EXISTS claimed_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP;

-- 2. Index pour le polling rapide et éviter les deadlocks
CREATE INDEX IF NOT EXISTS idx_actions_pending_claimed
ON linkedin_actions_queue(status, claimed_by, claimed_at, created_at)
WHERE status = 'approved';

-- 3. Table de heartbeat des workers (monitoring)
CREATE TABLE IF NOT EXISTS worker_heartbeats (
  worker_id VARCHAR(255) PRIMARY KEY,
  last_seen TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  hostname VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Index sur last_seen pour nettoyer les workers morts
CREATE INDEX IF NOT EXISTS idx_worker_heartbeats_seen
ON worker_heartbeats(last_seen);

-- 5. Mettre à jour les actions bloquées au statut 'approved' au cas où
UPDATE linkedin_actions_queue
SET status = 'approved',
    claimed_by = NULL,
    claimed_at = NULL
WHERE status = 'processing'
  AND claimed_at < NOW() - INTERVAL '10 minutes';
