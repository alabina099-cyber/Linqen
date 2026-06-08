import { Pool, PoolClient } from 'pg';

// Configuration de la connexion Neon DB
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Fonction utilitaire pour exécuter des requêtes
export async function query(text: string, params?: any[]) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

// Fonction pour obtenir un client (pour les transactions)
export async function getClient(): Promise<PoolClient> {
  return await pool.connect();
}

// Fonction pour tester la connexion
export async function testConnection() {
  try {
    const result = await query('SELECT NOW() as current_time');
    return { 
      success: true, 
      message: 'Connexion réussie à Neon DB',
      timestamp: result.rows[0].current_time 
    };
  } catch (error) {
    return { 
      success: false, 
      message: 'Erreur de connexion',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Fonctions CRUD exemples pour les campagnes
export async function getCampaigns() {
  const result = await query('SELECT * FROM campaigns ORDER BY created_at DESC');
  return result.rows;
}

export async function getCampaignById(id: number) {
  const result = await query('SELECT * FROM campaigns WHERE id = $1', [id]);
  return result.rows[0];
}

export async function createCampaign(data: {
  name: string;
  status: string;
  target: string;
  template: string;
  description?: string;
  industry?: string;
  location?: string;
  company_size?: string;
  objective?: string;
  seniority?: string;
  campaign_type?: string;
  daily_limit?: number;
  follow_up_days?: number;
}) {
  const result = await query(
    `INSERT INTO campaigns (name, status, target, template, description, industry, location, company_size, objective, seniority, campaign_type, daily_limit, follow_up_days, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
     RETURNING *`,
    [data.name, data.status, data.target, data.template, data.description, data.industry, data.location, data.company_size, data.objective || null, data.seniority || null, data.campaign_type || 'messages', data.daily_limit || 20, data.follow_up_days || 3]
  );
  return result.rows[0];
}

export async function updateCampaign(id: number, data: Partial<{
  name: string;
  status: string;
  target: string;
  template: string;
  description: string;
  industry: string;
  location: string;
  company_size: string;
}>) {
  const fields = Object.keys(data);
  const values = Object.values(data);
  const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
  
  const result = await query(
    `UPDATE campaigns SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return result.rows[0];
}

export async function deleteCampaign(id: number) {
  await query('DELETE FROM campaigns WHERE id = $1', [id]);
  return { deleted: true };
}

// Fonctions pour les messages
export async function getMessages(campaignId?: number) {
  if (campaignId) {
    const result = await query(
      'SELECT * FROM messages WHERE campaign_id = $1 ORDER BY created_at DESC',
      [campaignId]
    );
    return result.rows;
  }
  const result = await query('SELECT * FROM messages ORDER BY created_at DESC');
  return result.rows;
}

export async function createMessage(data: {
  campaign_id: number;
  recipient_name: string;
  recipient_role?: string;
  recipient_company?: string;
  message_text: string;
  message_type?: string;
  status?: string;
  prospect_id?: number;
}) {
  const result = await query(
    `INSERT INTO messages (campaign_id, recipient_name, recipient_role, recipient_company, message_text, message_type, status, prospect_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
     RETURNING *`,
    [data.campaign_id, data.recipient_name, data.recipient_role ?? null, data.recipient_company ?? null, data.message_text, data.message_type ?? 'message', data.status ?? 'sent', data.prospect_id ?? null]
  );
  return result.rows[0];
}

// Fonctions pour les notifications
export async function getNotifications(userId?: number) {
  const sql = userId 
    ? 'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50'
    : 'SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50';
  const params = userId ? [userId] : [];
  const result = await query(sql, params);
  return result.rows;
}

export async function getUnreadNotificationsCount(userId?: number) {
  const sql = userId
    ? 'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = false'
    : 'SELECT COUNT(*) as count FROM notifications WHERE read = false';
  const params = userId ? [userId] : [];
  const result = await query(sql, params);
  return parseInt(result.rows[0]?.count || '0');
}

export async function createNotification(data: {
  user_id?: number;
  type: string;
  title: string;
  message: string;
  data?: any;
}) {
  const result = await query(
    `INSERT INTO notifications (user_id, type, title, message, data, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     RETURNING *`,
    [data.user_id || null, data.type, data.title, data.message, JSON.stringify(data.data || {})]
  );
  return result.rows[0];
}

export async function markNotificationAsRead(id: number) {
  await query('UPDATE notifications SET read = true WHERE id = $1', [id]);
  return { success: true };
}

export async function markAllNotificationsAsRead(userId?: number) {
  const sql = userId
    ? 'UPDATE notifications SET read = true WHERE user_id = $1'
    : 'UPDATE notifications SET read = true';
  const params = userId ? [userId] : [];
  await query(sql, params);
  return { success: true };
}

// Fonctions pour les prospects (online status)
export async function updateProspectLastSeen(prospectId: number) {
  await query(
    'UPDATE prospects SET last_seen = NOW() WHERE id = $1',
    [prospectId]
  );
  return { success: true };
}

export async function getOnlineProspectsCount(minutes: number = 5) {
  const result = await query(
    `SELECT COUNT(*) as count FROM prospects 
     WHERE last_seen > NOW() - INTERVAL '${minutes} minutes'`
  );
  return parseInt(result.rows[0]?.count || '0');
}

// ==========================================
// Fonctions Worker Queue (mode cloud workers)
// ==========================================

export async function claimNextAction(workerId: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE linkedin_actions_queue
       SET status = 'processing',
           claimed_by = $1,
           claimed_at = NOW()
       WHERE id = (
         SELECT id FROM linkedin_actions_queue
         WHERE status = 'approved'
           AND (claimed_by IS NULL OR claimed_at < NOW() - INTERVAL '5 minutes')
         ORDER BY created_at ASC
         FOR UPDATE SKIP LOCKED
         LIMIT 1
       )
       RETURNING *;`,
      [workerId]
    );
    await client.query('COMMIT');
    return result.rows[0] || null;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function completeAction(actionId: number, result: Record<string, any>) {
  await query(
    `UPDATE linkedin_actions_queue
     SET status = 'completed',
         result = $2::jsonb,
         executed_at = NOW(),
         claimed_by = NULL
     WHERE id = $1;`,
    [actionId, JSON.stringify(result)]
  );
}

export async function failAction(actionId: number, error: string, details?: string) {
  await query(
    `UPDATE linkedin_actions_queue
     SET status = 'failed',
         error_message = $2,
         result = COALESCE(result, '{}') || $3::jsonb,
         claimed_by = NULL
     WHERE id = $1;`,
    [actionId, error, JSON.stringify({ error_details: details || null, failed_at: new Date().toISOString() })]
  );
}

export async function releaseStuckActions(timeoutMinutes: number = 5) {
  const result = await query(
    `UPDATE linkedin_actions_queue
     SET status = 'approved',
         claimed_by = NULL,
         claimed_at = NULL
     WHERE status = 'processing'
       AND claimed_at < NOW() - INTERVAL '${timeoutMinutes} minutes'
     RETURNING id;`
  );
  return result.rows.length;
}

export async function getQueueStats() {
  const result = await query(
    `SELECT status, COUNT(*) as count
     FROM linkedin_actions_queue
     WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
     GROUP BY status;`
  );
  const stats: Record<string, number> = {};
  for (const row of result.rows) {
    stats[row.status] = parseInt(row.count, 10);
  }
  return stats;
}

export async function updateWorkerHeartbeat(workerId: string) {
  await query(
    `INSERT INTO worker_heartbeats (worker_id, last_seen, hostname)
     VALUES ($1, NOW(), $2)
     ON CONFLICT (worker_id)
     DO UPDATE SET last_seen = NOW(), hostname = $2;`,
    [workerId, process.env.HOSTNAME || 'unknown']
  );
}

// Helper: insérer une action LinkedIn avec user_id depuis le contexte agent
import { agentContext } from './agent-context';

export async function insertLinkedInAction(columns: {
  action_type: string;
  target_url: string;
  target_name?: string | null;
  payload?: Record<string, any>;
  status?: string;
  campaign_id?: number | null;
  prospect_id?: number | null;
}) {
  const ctx = agentContext.getStore();
  const userId = ctx?.userId ?? null;

  const result = await query(
    `INSERT INTO linkedin_actions_queue
     (action_type, target_url, target_name, payload, status, campaign_id, prospect_id, user_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING id`,
    [
      columns.action_type,
      columns.target_url,
      columns.target_name ?? null,
      JSON.stringify(columns.payload || {}),
      columns.status || 'pending_approval',
      columns.campaign_id ?? null,
      columns.prospect_id ?? null,
      userId,
    ]
  );
  return result.rows[0].id as number;
}

export default pool;
