import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/debug/actions - Vérifier l'état des actions récentes (debug uniquement)
export async function GET(request: NextRequest) {
  try {
    const result = await query(
      `SELECT q.*, c.name as campaign_name, c.status as campaign_status
       FROM linkedin_actions_queue q
       LEFT JOIN campaigns c ON c.id = q.campaign_id
       ORDER BY q.created_at DESC
       LIMIT 10`
    );

    return NextResponse.json({
      success: true,
      actions: result.rows,
    });
  } catch (error) {
    console.error('Error fetching debug actions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch actions' },
      { status: 500 }
    );
  }
}
