import { Pool } from 'pg';
import { LinkedInAction } from './types';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[DB] Erreur inattendue sur le pool PostgreSQL:', err.message);
});

/**
 * Récupère et verrouille la prochaine action approuvée non assignée.
 * Utilise SELECT ... FOR UPDATE SKIP LOCKED pour éviter les conflits entre workers.
 */
export async function claimNextAction(workerId: string): Promise<LinkedInAction | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query<LinkedInAction>(`
      UPDATE linkedin_actions_queue
      SET
        status = 'processing',
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
      RETURNING *;
    `, [workerId]);

    await client.query('COMMIT');

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Marque une action comme complétée avec son résultat.
 */
export async function completeAction(actionId: number, result: Record<string, any>): Promise<void> {
  await pool.query(
    `UPDATE linkedin_actions_queue
     SET status = 'completed',
         result = $2::jsonb,
         executed_at = NOW(),
         claimed_by = NULL
     WHERE id = $1;`,
    [actionId, JSON.stringify(result)]
  );
}

/**
 * Marque une action comme échouée avec le message d'erreur.
 */
export async function failAction(actionId: number, error: string, details?: string): Promise<void> {
  await pool.query(
    `UPDATE linkedin_actions_queue
     SET status = 'failed',
         error_message = $2,
         result = COALESCE(result, '{}') || $3::jsonb,
         claimed_by = NULL
     WHERE id = $1;`,
    [actionId, error, JSON.stringify({ error_details: details || null, failed_at: new Date().toISOString() })]
  );
}

/**
 * Libère une action bloquée (si le worker meurt en plein traitement).
 * Utile pour le heartbeat / recovery.
 */
export async function releaseStuckActions(timeoutMinutes: number = 5): Promise<number> {
  const result = await pool.query(
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

/**
 * Compte les actions en attente pour monitoring.
 */
export async function getQueueStats(): Promise<Record<string, number>> {
  const result = await pool.query(
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

/**
 * Met à jour le heartbeat du worker (dernière activité).
 */
export async function updateWorkerHeartbeat(workerId: string): Promise<void> {
  await pool.query(
    `INSERT INTO worker_heartbeats (worker_id, last_seen, hostname)
     VALUES ($1, NOW(), $2)
     ON CONFLICT (worker_id)
     DO UPDATE SET last_seen = NOW(), hostname = $2;`,
    [workerId, process.env.HOSTNAME || 'unknown']
  );
}

export async function closePool(): Promise<void> {
  await pool.end();
}
