import { Pool, PoolClient } from 'pg';

// Configuration de la connexion Neon DB
const pool = new Pool({
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
}) {
  const result = await query(
    `INSERT INTO campaigns (name, status, target, template, description, industry, location, company_size, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
     RETURNING *`,
    [data.name, data.status, data.target, data.template, data.description, data.industry, data.location, data.company_size]
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

export default pool;
