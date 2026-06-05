import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ensureOwnershipColumns, getRequestUser, getScopeUserIds } from '@/lib/requestAuth';

// GET /api/linkedin-actions/approval - Récupérer les actions (scopées par utilisateur)
export async function GET(request: NextRequest) {
  try {
    await ensureOwnershipColumns();
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const scopeIds = await getScopeUserIds(user);
    const isAdmin = user.role === 'admin';
    const scopeClause = isAdmin
      ? '(user_id = ANY($1) OR user_id IS NULL)'
      : 'user_id = ANY($1)';
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '500');

    // If no status specified, return all actions ordered chronologically
    let result;
    if (!status || status === 'all') {
      result = await query(
        `SELECT q.*, u.name as owner_name FROM linkedin_actions_queue q
         LEFT JOIN users u ON u.id = q.user_id
         WHERE ${scopeClause}
         ORDER BY created_at DESC 
         LIMIT $2`,
        [scopeIds, limit]
      );
    } else {
      result = await query(
        `SELECT q.*, u.name as owner_name FROM linkedin_actions_queue q
         LEFT JOIN users u ON u.id = q.user_id
         WHERE ${scopeClause}
           AND status = $2
         ORDER BY created_at DESC 
         LIMIT $3`,
        [scopeIds, status, limit]
      );
    }

    // Stats par statut - inclure tous les statuts possibles
    const stats = await query(
      `SELECT 
        s.status,
        COALESCE(COUNT(a.id), 0) as count
       FROM (VALUES 
         ('pending_approval'), 
         ('approved'), 
         ('completed'), 
         ('rejected'), 
         ('failed'),
         ('processing'),
         ('stopped')
       ) AS s(status)
       LEFT JOIN linkedin_actions_queue a ON a.status = s.status
         AND ${scopeClause}
       GROUP BY s.status
       ORDER BY s.status`,
      [scopeIds]
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
    await ensureOwnershipColumns();
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const scopeIds = await getScopeUserIds(user);
    const isAdmin = user.role === 'admin';

    const body = await request.json();
    const { id, action, reason } = body;

    if (!id || !action) {
      return NextResponse.json(
        { success: false, error: 'id et action sont requis' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject', 'stop', 'continue', 'retry'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'action doit être "approve", "reject", "stop", "continue" ou "retry"' },
        { status: 400 }
      );
    }

    let newStatus: string;
    switch (action) {
      case 'approve':
        newStatus = 'approved';
        break;
      case 'reject':
        newStatus = 'rejected';
        break;
      case 'stop':
        newStatus = 'stopped';
        break;
      case 'continue':
        newStatus = 'processing';
        break;
      case 'retry':
        newStatus = 'pending_approval';
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Action invalide' },
          { status: 400 }
        );
    }

    // Vérifier que l'action existe et appartient au scope
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
    const ownerId = actionData.user_id;
    const allowed = ownerId == null ? isAdmin : scopeIds.includes(ownerId);
    if (!allowed) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Valider le statut actuel selon l'action demandée
    switch (action) {
      case 'approve':
      case 'reject':
        if (actionData.status !== 'pending_approval') {
          return NextResponse.json(
            { success: false, error: `Seules les actions en attente peuvent être approuvées/rejetées (statut actuel: ${actionData.status})` },
            { status: 400 }
          );
        }
        break;
      case 'stop':
        if (!['approved', 'processing'].includes(actionData.status)) {
          return NextResponse.json(
            { success: false, error: `Seules les actions approuvées ou en cours peuvent être arrêtées (statut actuel: ${actionData.status})` },
            { status: 400 }
          );
        }
        break;
      case 'continue':
        if (actionData.status !== 'stopped') {
          return NextResponse.json(
            { success: false, error: `Seules les actions arrêtées peuvent être reprises (statut actuel: ${actionData.status})` },
            { status: 400 }
          );
        }
        break;
      case 'retry':
        if (!['rejected', 'failed'].includes(actionData.status)) {
          return NextResponse.json(
            { success: false, error: `Seules les actions rejetées ou échouées peuvent être réessayées (statut actuel: ${actionData.status})` },
            { status: 400 }
          );
        }
        break;
    }

    // Mettre à jour le statut
    const shouldClearError = action === 'retry' || action === 'approve' || action === 'continue';
    const updateResult = await query(
      `UPDATE linkedin_actions_queue 
       SET status = $1, 
           result = COALESCE(result, '{}') || $2::jsonb,
           error_message = ${shouldClearError ? 'NULL' : 'error_message'},
           executed_at = ${action === 'retry' ? 'NULL' : 'executed_at'}
       WHERE id = $3
       RETURNING *`,
      [newStatus, JSON.stringify({ 
        approval_reason: reason || null, 
        approved_at: new Date().toISOString(),
        last_action: action
      }), id]
    );

    // Auto-activation: quand une action liée à une campagne est approuvée,
    // activer la campagne si elle est encore en draft
    if (action === 'approve' && actionData.campaign_id) {
      try {
        await query(
          `UPDATE campaigns SET status = 'active', updated_at = NOW() 
           WHERE id = $1 AND status = 'draft'`,
          [actionData.campaign_id]
        );
        console.log(`[APPROVAL] Campaign #${actionData.campaign_id} activée suite à l'approbation de l'action #${id}`);
      } catch (e) {
        console.error('[APPROVAL] Erreur activation campagne:', e);
      }
    }

    let message: string;
    switch (action) {
      case 'approve':
        message = `✅ Action #${id} approuvée. Elle sera exécutée par l'extension Chrome.`;
        break;
      case 'reject':
        message = `❌ Action #${id} rejetée. Elle ne sera pas exécutée.`;
        break;
      case 'stop':
        message = `⏹️ Action #${id} arrêtée. L'exécution a été interrompue.`;
        break;
      case 'continue':
        message = `▶️ Action #${id} reprise. L'exécution continue depuis le point d'arrêt.`;
        break;
      case 'retry':
        message = `🔄 Action #${id} remise en attente. Vous pouvez l'approuver à nouveau.`;
        break;
      default:
        message = `Action #${id} mise à jour.`;
    }

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
    await ensureOwnershipColumns();
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const scopeIds = await getScopeUserIds(user);
    const isAdmin = user.role === 'admin';

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id est requis' },
        { status: 400 }
      );
    }

    // Vérifier l'ownership avant suppression
    const ownerCheck = await query(`SELECT user_id FROM linkedin_actions_queue WHERE id = $1`, [id]);
    if (ownerCheck.rows.length > 0) {
      const ownerId = ownerCheck.rows[0].user_id;
      const allowed = ownerId == null ? isAdmin : scopeIds.includes(ownerId);
      if (!allowed) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
      }
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
