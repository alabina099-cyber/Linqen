import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// POST /api/linkedin-actions/auto-approve - Auto-approve actions for active campaigns
export async function POST(request: NextRequest) {
  try {
    // Approuver automatiquement les actions en attente pour les campagnes actives
    const result = await query(
      `UPDATE linkedin_actions_queue q
       SET status = 'approved', updated_at = NOW()
       FROM campaigns c
       WHERE q.campaign_id = c.id
         AND c.status = 'active'
         AND q.status = 'pending_approval'
         AND q.created_at >= CURRENT_DATE
       RETURNING q.id, q.campaign_id, q.action_type`
    );

    const approvedCount = result.rows.length;

    return NextResponse.json({
      success: true,
      approved_count: approvedCount,
      actions: result.rows,
    });
  } catch (error) {
    console.error('Error auto-approving actions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to auto-approve actions' },
      { status: 500 }
    );
  }
}
