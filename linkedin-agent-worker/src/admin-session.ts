// =============================================================
// admin-session.ts — Multi-Admin SaaS
// -------------------------------------------------------------
// À partir d'une action récupérée de la file, ce module remonte
// jusqu'à l'ADMIN propriétaire (qui possède le cookie LinkedIn)
// et retourne la session déchiffrée prête à être appliquée à
// Puppeteer.
// =============================================================

import crypto from 'crypto';
import { Pool } from 'pg';
import { AdminLinkedInSession, LinkedInAction } from './types';

// ---- Chiffrement (doit matcher lib/security.ts côté frontend) ----
const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    return crypto
      .createHash('sha256')
      .update(key || 'linkedin-agent-default-dev-key-change-in-prod')
      .digest();
  }
  return Buffer.from(key.slice(0, 32), 'utf-8');
}

function decryptCookie(ciphertext: string): string {
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    // Backward-compat : si le cookie a été stocké en clair (legacy),
    // on le retourne tel quel.
    return ciphertext;
  }
  const [ivHex, authTagHex, encryptedHex] = parts;
  try {
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf-8');
  } catch {
    // Si le déchiffrement échoue, on retourne le ciphertext tel quel.
    return ciphertext;
  }
}

// ---- Résolution de la session LinkedIn d'un admin pour une action ----
//
// Politique :
//  1. Si action.user_id est défini :
//     - On charge ce user. S'il est admin -> on prend son cookie.
//     - S'il est user secondaire -> on remonte à admin_id et on prend
//       le cookie de l'admin parent.
//  2. Si action.user_id est NULL (action legacy) :
//     - On prend le premier admin de la base avec un cookie défini.
//       Cela maintient la compatibilité avec les anciennes actions
//       créées avant la migration multi-admin.
//
// Retourne null si aucun cookie LinkedIn n'est disponible.
export async function resolveAdminSession(
  pool: Pool,
  action: LinkedInAction
): Promise<AdminLinkedInSession | null> {
  // ---- 1. Tentative via action.user_id ----
  if (action.user_id) {
    const userRow = await pool.query(
      `SELECT id, name, role, admin_id FROM users WHERE id = $1 AND is_active = true`,
      [action.user_id]
    );
    const u = userRow.rows[0];
    if (u) {
      const targetAdminId = u.role === 'admin' ? u.id : u.admin_id;
      if (targetAdminId) {
        const adminRow = await pool.query(
          `SELECT id, name, linkedin_session_cookie
             FROM users
            WHERE id = $1 AND role = 'admin' AND is_active = true
              AND linkedin_session_cookie IS NOT NULL
              AND linkedin_session_cookie <> ''`,
          [targetAdminId]
        );
        const admin = adminRow.rows[0];
        if (admin?.linkedin_session_cookie) {
          return {
            adminId: admin.id,
            adminName: admin.name,
            cookieValue: decryptCookie(admin.linkedin_session_cookie),
          };
        }
      }
    }
  }

  // ---- 2. Fallback legacy : premier admin avec cookie ----
  // Utilisé uniquement pour les actions sans user_id (anciennes données).
  const legacy = await pool.query(
    `SELECT id, name, linkedin_session_cookie
       FROM users
      WHERE role = 'admin' AND is_active = true
        AND linkedin_session_cookie IS NOT NULL
        AND linkedin_session_cookie <> ''
      ORDER BY id ASC
      LIMIT 1`
  );
  const fallback = legacy.rows[0];
  if (fallback?.linkedin_session_cookie) {
    return {
      adminId: fallback.id,
      adminName: fallback.name,
      cookieValue: decryptCookie(fallback.linkedin_session_cookie),
    };
  }

  return null;
}
