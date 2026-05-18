import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { createNotification } from '@/lib/notifications';

// OPTIONS — CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

// Helper: check if current time is within working hours configured by the user
async function isWithinWorkingHours(): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const userResult = await query('SELECT settings FROM users LIMIT 1');
    const automation = userResult.rows[0]?.settings?.automation || {};

    const workingDays: string[]   = automation.workingDays        || ['Mon','Tue','Wed','Thu','Fri'];
    const workingHoursStart: string = automation.workingHoursStart || '09:00';
    const workingHoursEnd: string   = automation.workingHoursEnd   || '18:00';

    // Get current Paris time (default timezone)
    const now = new Date();
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const currentDay = dayNames[now.getDay()];

    if (!workingDays.includes(currentDay)) {
      return { allowed: false, reason: `Aujourd'hui (${currentDay}) n'est pas un jour de prospection.` };
    }

    const [startH, startM] = workingHoursStart.split(':').map(Number);
    const [endH,   endM]   = workingHoursEnd.split(':').map(Number);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes   = startH * 60 + startM;
    const endMinutes     = endH   * 60 + endM;

    if (currentMinutes < startMinutes || currentMinutes >= endMinutes) {
      return { allowed: false, reason: `Hors des heures de travail (${workingHoursStart}-${workingHoursEnd}).` };
    }

    return { allowed: true };
  } catch {
    return { allowed: true }; // Don't block if settings can't be read
  }
}

// GET /api/linkedin-actions - Récupérer les actions (appelé par l'extension Chrome)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const actionId = searchParams.get('id');

    // Si un id est fourni, récupérer cette action spécifique
    if (actionId) {
      const result = await query(
        `SELECT * FROM linkedin_actions_queue WHERE id = $1`,
        [parseInt(actionId)]
      );
      return NextResponse.json({
        success: true,
        actions: result.rows,
        count: result.rows.length,
      });
    }

    // L'extension Chrome ne récupère que les actions "approved" (approuvées par l'utilisateur)
    const status = searchParams.get('status') || 'approved';

    // Vérifier les heures de travail pour les actions approuvées
    if (status === 'approved') {
      const workCheck = await isWithinWorkingHours();
      if (!workCheck.allowed) {
        return NextResponse.json({
          success: true,
          actions: [],
          count: 0,
          paused: true,
          reason: workCheck.reason,
          stats: [],
        });
      }
    }
    const limit = parseInt(searchParams.get('limit') || '10');

    // Pour les actions à exécuter (approved), exclure celles dont la campagne liée
    // est en pause ou terminée. L'utilisateur peut ainsi mettre une campagne en pause
    // dans l'UI et l'extension arrêtera de récupérer ses actions.
    const result = await query(
      `SELECT q.* FROM linkedin_actions_queue q
       LEFT JOIN campaigns c ON c.id = q.campaign_id
       WHERE q.status = $1
         AND (q.campaign_id IS NULL OR c.status NOT IN ('paused', 'completed'))
       ORDER BY q.created_at ASC 
       LIMIT $2`,
      [status, limit]
    );

    // Stats pour le dashboard
    const stats = await query(
      `SELECT 
        status,
        COUNT(*) as count
       FROM linkedin_actions_queue 
       WHERE created_at >= CURRENT_DATE 
       GROUP BY status`
    );

    return NextResponse.json({
      success: true,
      actions: result.rows,
      count: result.rows.length,
      stats: stats.rows,
    });
  } catch (error) {
    console.error('Error fetching linkedin actions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch actions' },
      { status: 500 }
    );
  }
}

// POST /api/linkedin-actions - Créer une action (agent ou manuelle)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action_type, target_url, target_name, payload, campaign_id, source } = body;

    if (!action_type) {
      return NextResponse.json(
        { success: false, error: 'action_type est requis' },
        { status: 400 }
      );
    }

    // Seules les actions créées par l'agent nécessitent une approbation
    // Les actions manuelles sont automatiquement approuvées
    const status = source === 'agent' ? 'pending_approval' : 'approved';

    const result = await query(
      `INSERT INTO linkedin_actions_queue (action_type, target_url, target_name, payload, status, campaign_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [action_type, target_url || null, target_name || null, JSON.stringify(payload || {}), status, campaign_id || null]
    );

    return NextResponse.json({
      success: true,
      action: result.rows[0],
    });
  } catch (error) {
    console.error('Error creating linkedin action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create action' },
      { status: 500 }
    );
  }
}

// PATCH /api/linkedin-actions - Mettre à jour le statut d'une action (appelé par l'extension Chrome après exécution)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, result: actionResult, error_message } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: 'id et status sont requis' },
        { status: 400 }
      );
    }

    // Vérifier que l'action n'a pas été arrêtée par l'utilisateur
    // Si le statut actuel est 'stopped', ne pas laisser l'extension écraser avec completed/failed
    const currentAction = await query(`SELECT status FROM linkedin_actions_queue WHERE id = $1`, [id]);
    if (currentAction.rows.length > 0 && currentAction.rows[0].status === 'stopped' && status !== 'stopped') {
      return NextResponse.json({
        success: true,
        action: currentAction.rows[0],
        message: 'Action arrêtée par l\'utilisateur, statut non modifié'
      });
    }

    // Mettre à jour l'action
    const updateResult = await query(
      `UPDATE linkedin_actions_queue 
       SET status = $1, result = $2, error_message = $3, executed_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [status, JSON.stringify(actionResult || {}), error_message || null, id]
    );

    if (updateResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Action non trouvée' },
        { status: 404 }
      );
    }

    const action = updateResult.rows[0];

    // Si l'action est "visit_profile" et a réussi, sauvegarder les données du prospect
    if (action.action_type === 'visit_profile' && status === 'completed' && actionResult?.profile) {
      const profile = actionResult.profile;
      await query(
        `INSERT INTO prospects (name, role, company, linkedin_url, industry, location, company_size, score, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 50, NOW(), NOW())
         ON CONFLICT (linkedin_url) DO UPDATE SET
           name = COALESCE(EXCLUDED.name, prospects.name),
           role = COALESCE(EXCLUDED.role, prospects.role),
           company = COALESCE(EXCLUDED.company, prospects.company),
           industry = COALESCE(EXCLUDED.industry, prospects.industry),
           location = COALESCE(EXCLUDED.location, prospects.location),
           updated_at = NOW()`,
        [
          profile.name || null, profile.role || null, profile.company || null,
          action.target_url, profile.industry || null, profile.location || null,
          profile.company_size || null
        ]
      );
    }

    // Créer une notification in-app pour les actions importantes
    if (status === 'completed') {
      if (action.action_type === 'send_connection') {
        await createNotification(
          'connection',
          'Invitation envoyée',
          `Demande de connexion envoyée à ${action.target_name || 'un prospect'}`,
          { action_id: action.id, target_url: action.target_url }
        );
      } else if (action.action_type === 'send_message') {
        await createNotification(
          'message',
          'Message envoyé',
          `Message envoyé à ${action.target_name || 'un prospect'}`,
          { action_id: action.id, target_url: action.target_url }
        );
      }
    } else if (status === 'failed') {
      await createNotification(
        'alert',
        'Action échouée',
        `L'action ${action.action_type} vers ${action.target_name || 'un prospect'} a échoué`,
        { action_id: action.id, error: error_message }
      );
    }

    // Si l'action est "send_connection" ou "send_message" et a réussi, mettre à jour le statut du message
    if ((action.action_type === 'send_connection' || action.action_type === 'send_message') && status === 'completed') {
      await query(
        `UPDATE messages SET status = 'sent' 
         WHERE recipient_name = $1 AND status = 'pending'
         ORDER BY created_at DESC LIMIT 1`,
        [action.target_name]
      );

      // Mettre à jour les stats de la campagne
      if (action.campaign_id) {
        await query(
          `UPDATE campaigns SET contacted = contacted + 1, updated_at = NOW() WHERE id = $1`,
          [action.campaign_id]
        );
      }
    }

    // Si l'action est "search_and_message" et a réussi, mettre à jour les stats campagne avec le total de messages envoyés
    if (action.action_type === 'search_and_message' && status === 'completed' && action.campaign_id) {
      const resultData = typeof actionResult === 'object' ? actionResult : {};
      const messagesSent = resultData.messages_sent || 0;
      if (messagesSent > 0) {
        // Synchroniser le compteur "contacted" de la campagne avec le nombre réel de messages envoyés
        // On utilise une sous-requête pour compter les messages liés à cette campagne
        await query(
          `UPDATE campaigns SET 
            contacted = (SELECT COUNT(*) FROM messages WHERE campaign_id = $1 AND status = 'sent'),
            updated_at = NOW() 
           WHERE id = $1`,
          [action.campaign_id]
        );
      }
    }

    // Auto-completion: quand l'action principale (search_and_connection ou search_and_message)
    // d'une campagne se termine (avec succès ou échec), marquer la campagne comme "completed".
    // L'utilisateur peut relancer en appelant execute_campaign (qui n'autorise que draft/active).
    if (
      action.campaign_id &&
      (action.action_type === 'search_and_connection' || action.action_type === 'search_and_message') &&
      (status === 'completed' || status === 'failed')
    ) {
      try {
        await query(
          `UPDATE campaigns SET status = 'completed', updated_at = NOW() 
           WHERE id = $1 AND status = 'active'`,
          [action.campaign_id]
        );
        console.log(`[CAMPAIGN] Campaign #${action.campaign_id} marquée comme 'completed' (action #${id} ${status})`);
      } catch (e) {
        console.error('[CAMPAIGN] Erreur completion campagne:', e);
      }
    }

    return NextResponse.json({
      success: true,
      action: updateResult.rows[0],
    });
  } catch (error) {
    console.error('Error updating linkedin action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update action' },
      { status: 500 }
    );
  }
}
