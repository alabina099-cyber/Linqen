import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/notifications - Get notifications and stats
export async function GET(request: NextRequest) {
  try {
    // Get unread count
    const unreadResult = await query(
      `SELECT COUNT(*) as count FROM notifications WHERE read = false`
    );
    
    // Get total notifications with limit
    const notificationsResult = await query(
      `SELECT * FROM notifications 
       ORDER BY created_at DESC 
       LIMIT 50`
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
    const body = await request.json();
    const { type, title, message, data } = body;

    const result = await query(
      `INSERT INTO notifications (type, title, message, data) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [type, title, message, JSON.stringify(data || {})]
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

// DELETE /api/notifications - Delete all notifications
export async function DELETE() {
  try {
    await query(`DELETE FROM notifications`);
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
    const body = await request.json();
    const { id, read } = body;

    if (id) {
      // Mark specific notification as read
      await query(
        `UPDATE notifications SET read = $1 WHERE id = $2`,
        [read, id]
      );
    } else {
      // Mark all as read
      await query(`UPDATE notifications SET read = true`);
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
