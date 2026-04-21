import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// OPTIONS — CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

// GET /api/messages - Récupérer les messages
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const campaign_id = searchParams.get('campaign_id');

    let result;
    if (campaign_id) {
      result = await query(
        `SELECT * FROM messages WHERE campaign_id = $1 ORDER BY created_at DESC LIMIT $2`,
        [parseInt(campaign_id), limit]
      );
    } else {
      result = await query(
        `SELECT * FROM messages ORDER BY created_at DESC LIMIT $1`,
        [limit]
      );
    }

    return NextResponse.json({
      success: true,
      messages: result.rows,
      count: result.rows.length,
    }, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch messages' },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}

// POST /api/messages - Créer un message (appelé par l'extension Chrome)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recipient_name, recipient_role, recipient_company, message_text, message_type, status, campaign_id, prospect_id } = body;

    if (!message_text) {
      return NextResponse.json(
        { success: false, error: 'message_text est requis' },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    const result = await query(
      `INSERT INTO messages (recipient_name, recipient_role, recipient_company, message_text, message_type, status, campaign_id, prospect_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        recipient_name || null,
        recipient_role || null,
        recipient_company || null,
        message_text,
        message_type || 'connection',
        status || 'sent',
        campaign_id || null,
        prospect_id || null,
      ]
    );

    return NextResponse.json({
      success: true,
      message: result.rows[0],
    }, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create message' },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}
