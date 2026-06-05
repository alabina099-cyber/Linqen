-- Migration 002 : Architecture Auth + Roles (Admin / User)
-- Objectif : 2 roles (admin, user). Admin = connexion LinkedIn. User = identifiants crées par l'admin.

-- 1. Modifier la table users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),      -- pour les users secondaires (login email/mdp)
ADD COLUMN IF NOT EXISTS admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,  -- NULL = admin, non-null = user lié à un admin
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;    -- pour désactiver un user sans le supprimer

-- 2. Rendre le champ role fonctionnel avec un CHECK constraint
-- (supprimer les anciennes valeurs non conformes si nécessaire)
UPDATE users SET role = 'admin' WHERE role IS NULL OR role NOT IN ('admin', 'user');

-- 3. Ajouter un index pour accélérer les recherches par admin
CREATE INDEX IF NOT EXISTS idx_users_admin_id ON users(admin_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 4. Table sessions JWT (optionnel, mais utile pour révocation)
CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Table audit logs (qui fait quoi)
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(100) NOT NULL,  -- 'login', 'create_user', 'delete_user', 'launch_campaign'
  details JSONB DEFAULT '{}',
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);

-- 6. Initialiser les users existants comme admin
UPDATE users SET role = 'admin' WHERE role IS NULL OR role NOT IN ('admin', 'user');

-- 7. Les admins n'ont pas de password_hash ni d'admin_id
UPDATE users SET admin_id = NULL, password_hash = NULL WHERE role = 'admin';
