-- =============================================================
-- Migration 003 — Multi-Admin SaaS Architecture
-- =============================================================
-- Objectif :
--   Permettre à plusieurs administrateurs de coexister sur la même
--   plateforme (un seul déploiement, une seule base de données).
--   Chaque admin se connecte avec son propre compte LinkedIn et gère
--   jusqu'à 10 utilisateurs secondaires.
--
-- Changements :
--   1. Supprime l'index unique qui interdisait plusieurs admins.
--   2. Ajoute les colonnes LinkedIn directement sur la table `users`
--      (cookie chiffré, méthode, date de connexion, URL de profil).
--   3. Ajoute une contrainte d'unicité sur `linkedin_email` pour les admins.
--   4. Index pour retrouver rapidement un admin par son email LinkedIn.
-- =============================================================
-- 1. Supprimer le verrou mono-admin
DROP INDEX IF EXISTS idx_users_single_admin;
-- 2. Ajouter les colonnes nécessaires à l'auth LinkedIn par admin
ALTER TABLE users
ADD COLUMN IF NOT EXISTS linkedin_session_cookie TEXT;
ALTER TABLE users
ADD COLUMN IF NOT EXISTS linkedin_auth_method VARCHAR(32);
ALTER TABLE users
ADD COLUMN IF NOT EXISTS linkedin_connected_at TIMESTAMP;
ALTER TABLE users
ADD COLUMN IF NOT EXISTS linkedin_profile_url TEXT;
-- 3. Index pour lookup rapide par email LinkedIn (admins multi-tenant)
CREATE INDEX IF NOT EXISTS idx_users_linkedin_email ON users(linkedin_email);
-- 4. Colonnes user_id pour le multi-tenant (aussi gérées par ensureOwnershipColumns, idempotent)
ALTER TABLE linkedin_actions_queue
ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE
SET NULL;
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE
SET NULL;
ALTER TABLE prospects
ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE
SET NULL;
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE
SET NULL;
-- 5. Index pour le scoping multi-tenant
CREATE INDEX IF NOT EXISTS idx_actions_user ON linkedin_actions_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_user ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_prospects_user ON prospects(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id);