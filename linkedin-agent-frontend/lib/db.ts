import { Pool, PoolClient } from 'pg';

// Configuration de la connexion Neon DB
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_uzan40Povxwp@ep-tiny-term-ai0m9euo-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
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
  daily_limit?: number;
  follow_up_days?: number;
}) {
  const result = await query(
    `INSERT INTO campaigns (name, status, target, template, description, industry, location, company_size, objective, seniority, daily_limit, follow_up_days, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
     RETURNING *`,
    [data.name, data.status, data.target, data.template, data.description, data.industry, data.location, data.company_size, data.objective || null, data.seniority || null, data.daily_limit || 20, data.follow_up_days || 3]
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
  message_text: string;
  status?: string;
}) {
  const result = await query(
    `INSERT INTO messages (campaign_id, recipient_name, recipient_role, message_text, status, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     RETURNING *`,
    [data.campaign_id, data.recipient_name, data.recipient_role, data.message_text, data.status || 'sent']
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

export default pool;
