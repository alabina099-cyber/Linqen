import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ensureOwnershipColumns, getRequestUser, getScopeUserIds } from '@/lib/requestAuth';

// POST /api/linkedin-actions/auto-approve - Auto-approve actions for active campaigns
export async function POST(request: NextRequest) {
  try {
    await ensureOwnershipColumns();
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const scopeIds = await getScopeUserIds(user);
    const isAdmin = user.role === 'admin';
    const scopeClause = isAdmin
      ? '(q.user_id = ANY($1) OR q.user_id IS NULL)'
      : 'q.user_id = ANY($1)';

    // Approuver automatiquement les actions en attente pour les campagnes actives
    const result = await query(
      `UPDATE linkedin_actions_queue q
       SET status = 'approved', updated_at = NOW()
       FROM campaigns c
       WHERE q.campaign_id = c.id
         AND c.status = 'active'
         AND q.status = 'pending_approval'
         AND q.created_at >= CURRENT_DATE
         AND ${scopeClause}
       RETURNING q.id, q.campaign_id, q.action_type`,
      [scopeIds]
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
