import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getRequestUser, getScopeUserIds } from '@/lib/requestAuth';

// GET /api/notifications - Get notifications and stats (scoped by user)
export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    const isAdmin = user?.role === 'admin';
    const scopeIds = user ? await getScopeUserIds(user) : [];

    const scopeClause = isAdmin
      ? '(user_id = ANY($1) OR user_id IS NULL)'
      : 'user_id = ANY($1)';

    // Get unread count (scoped)
    const unreadResult = await query(
      `SELECT COUNT(*) as count FROM notifications WHERE read = false AND ${scopeClause}`,
      [scopeIds]
    );

    // Get total notifications with limit (scoped)
    const notificationsResult = await query(
      `SELECT * FROM notifications
       WHERE ${scopeClause}
       ORDER BY created_at DESC
       LIMIT 50`,
      [scopeIds]
    );

    // Get online prospects (last seen within 5 minutes)
    const onlineResult = await query(
      `SELECT COUNT(*) as count FROM prospects 
       WHERE last_seen > NOW() - INTERVAL '5 minutes'`
    );

    // Get new replies count (messages with status replied, converted from last 24h)
    const newRepliesResult = await query(
      `SELECT COUNT(*) as count FROM messages 
       WHERE status IN ('replied', 'converted') 
       AND created_at > NOW() - INTERVAL '24 hours'`
    );

    return NextResponse.json({
      success: true,
      unread: parseInt(unreadResult.rows[0]?.count || '0'),
      online: parseInt(onlineResult.rows[0]?.count || '0'),
      newReplies: parseInt(newRepliesResult.rows[0]?.count || '0'),
      notifications: notificationsResult.rows
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications', unread: 0, online: 0, newReplies: 0, notifications: [] },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Create a notification
export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    const body = await request.json();
    const { type, title, message, data } = body;

    const result = await query(
      `INSERT INTO notifications (type, title, message, data, user_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [type, title, message, JSON.stringify(data || {}), user?.userId ?? null]
    );

    return NextResponse.json({
      success: true,
      notification: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications - Delete all notifications for current user
export async function DELETE(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    const isAdmin = user.role === 'admin';
    if (isAdmin) {
      await query(`DELETE FROM notifications`);
    } else {
      await query(`DELETE FROM notifications WHERE user_id = $1`, [user.userId]);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete notifications' },
      { status: 500 }
    );
  }
}

// PATCH /api/notifications - Mark as read
export async function PATCH(request: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // no body = mark all as read
    }
    const { id, read } = body;

    const user = await getRequestUser(request);
    const isAdmin = user?.role === 'admin';
    const scopeIds = user ? await getScopeUserIds(user) : [];
    const scopeClause = isAdmin
      ? '(user_id = ANY($1) OR user_id IS NULL)'
      : 'user_id = ANY($1)';

    if (id) {
      // Mark specific notification as read (only if belongs to user)
      await query(
        `UPDATE notifications SET read = $1 WHERE id = $2 AND ${scopeClause}`,
        [read ?? true, id, scopeIds]
      );
    } else {
      // Mark all as read (scoped)
      await query(`UPDATE notifications SET read = true WHERE ${scopeClause}`, [scopeIds]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}
