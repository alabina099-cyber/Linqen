import { query } from './db';

export type NotificationType = 'message' | 'reply' | 'connection' | 'alert';

export async function createNotification(
  type: NotificationType,
  title: string,
  message: string,
  data: Record<string, unknown> = {},
  userId: number | null = null
): Promise<void> {
  try {
    await query(
      `INSERT INTO notifications (type, title, message, data, read, user_id, created_at)
       VALUES ($1, $2, $3, $4, false, $5, NOW())`,
      [type, title, message, JSON.stringify(data), userId]
    );
  } catch (err) {
    console.error('[notifications] Failed to create notification:', err);
  }
}
