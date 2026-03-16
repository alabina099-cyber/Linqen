import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/linkedin-actions/approval - Récupérer les actions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    // If no status specified, return all actions ordered chronologically
    let result;
    if (!status || status === 'all') {
      result = await query(
        `SELECT * FROM linkedin_actions_queue 
         ORDER BY created_at DESC 
         LIMIT $1`,
        [limit]
      );
    } else {
      result = await query(
        `SELECT * FROM linkedin_actions_queue 
         WHERE status = $1 
         ORDER BY created_at DESC 
         LIMIT $2`,
        [status, limit]
      );
    }

    // Stats par statut
    const stats = await query(
      `SELECT 
        status,
        COUNT(*) as count
       FROM linkedin_actions_queue 
       GROUP BY status`
    );

    return NextResponse.json({
      success: true,
      actions: result.rows,
      count: result.rows.length,
      stats: stats.rows,
    });
  } catch (error) {
    console.error('Error fetching approval actions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch actions' },
      { status: 500 }
    );
  }
}

// POST /api/linkedin-actions/approval - Approuver ou rejeter une action
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, reason } = body;

    if (!id || !action) {
      return NextResponse.json(
        { success: false, error: 'id et action sont requis' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'action doit être "approve" ou "reject"' },
        { status: 400 }
      );
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Vérifier que l'action existe et est en attente d'approbation
    const checkResult = await query(
      `SELECT * FROM linkedin_actions_queue WHERE id = $1`,
      [id]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Action non trouvée' },
        { status: 404 }
      );
    }

    const actionData = checkResult.rows[0];

    // Vérifier que l'action est bien en attente d'approbation
    if (actionData.status !== 'pending_approval') {
      return NextResponse.json(
        { success: false, error: `Action déjà ${actionData.status}` },
        { status: 400 }
      );
    }

    // Mettre à jour le statut
    const updateResult = await query(
      `UPDATE linkedin_actions_queue 
       SET status = $1, result = COALESCE(result, '{}') || $2::jsonb
       WHERE id = $3
       RETURNING *`,
      [newStatus, JSON.stringify({ approval_reason: reason || null, approved_at: new Date().toISOString() }), id]
    );

    const message = action === 'approve' 
      ? `✅ Action #${id} approuvée. Elle sera exécutée par l'extension Chrome.`
      : `❌ Action #${id} rejetée. Elle ne sera pas exécutée.`;

    return NextResponse.json({
      success: true,
      action: updateResult.rows[0],
      message,
    });
  } catch (error) {
    console.error('Error approving/rejecting action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process action' },
      { status: 500 }
    );
  }
}

// DELETE /api/linkedin-actions/approval - Supprimer une action rejetée
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id est requis' },
        { status: 400 }
      );
    }

    const result = await query(
      `DELETE FROM linkedin_actions_queue WHERE id = $1 AND status = 'rejected' RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Action non trouvée ou non rejetée' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Action #${id} supprimée`,
    });
  } catch (error) {
    console.error('Error deleting action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete action' },
      { status: 500 }
    );
  }
}
