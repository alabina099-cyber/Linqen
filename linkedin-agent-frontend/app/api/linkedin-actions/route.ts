import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

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

// GET /api/linkedin-actions - Récupérer les actions (appelé par l'extension Chrome)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    // L'extension Chrome ne récupère que les actions "approved" (approuvées par l'utilisateur)
    const status = searchParams.get('status') || 'approved';
    const limit = parseInt(searchParams.get('limit') || '10');

    const result = await query(
      `SELECT * FROM linkedin_actions_queue 
       WHERE status = $1 
       ORDER BY created_at ASC 
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

// POST /api/linkedin-actions - Créer une action manuellement
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action_type, target_url, target_name, payload, campaign_id } = body;

    if (!action_type) {
      return NextResponse.json(
        { success: false, error: 'action_type est requis' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO linkedin_actions_queue (action_type, target_url, target_name, payload, status, campaign_id, created_at)
       VALUES ($1, $2, $3, $4, 'pending_approval', $5, NOW())
       RETURNING *`,
      [action_type, target_url || null, target_name || null, JSON.stringify(payload || {}), campaign_id || null]
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
