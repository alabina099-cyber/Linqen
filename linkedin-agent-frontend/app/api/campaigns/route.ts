import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ensureOwnershipColumns, getRequestUser, buildScopeClause } from '@/lib/requestAuth';

// GET /api/campaigns - Récupérer les campagnes selon le rôle
// User : ses propres campagnes — Admin : celles de toute l'équipe + attribution (owner_name)
export async function GET(request: NextRequest) {
  try {
    await ensureOwnershipColumns();
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Non authentifié' }, { status: 401 });
    }
    const scope = await buildScopeClause(user, 'c.user_id', 1);
    const r = await query(
      `SELECT c.*, u.name AS owner_name, u.id AS owner_id
       FROM campaigns c
       LEFT JOIN users u ON u.id = c.user_id
       WHERE ${scope.clause}
       ORDER BY c.created_at DESC`,
      scope.params
    );
    return NextResponse.json({ success: true, campaigns: r.rows });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Erreur lors de la récupération des campagnes',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// POST /api/campaigns - Créer une nouvelle campagne (associée au créateur)
export async function POST(request: NextRequest) {
  try {
    await ensureOwnershipColumns();
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Non authentifié' }, { status: 401 });
    }

    const data = await request.json();

    if (!data.name) {
      return NextResponse.json(
        { success: false, message: 'Le nom de la campagne est requis' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO campaigns
        (name, status, target, template, description, industry, location, company_size,
         objective, seniority, campaign_type, daily_limit, follow_up_days, user_id, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, NOW(), NOW())
       RETURNING *`,
      [
        data.name,
        data.status || 'draft',
        data.target || '',
        data.template || '',
        data.description || null,
        data.industry || null,
        data.location || null,
        data.company_size || null,
        data.objective || null,
        data.seniority || null,
        data.campaign_type || 'messages',
        data.daily_limit || 20,
        data.follow_up_days || 3,
        user.userId,
      ]
    );

    return NextResponse.json({ success: true, campaign: result.rows[0] });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Erreur lors de la création de la campagne',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
