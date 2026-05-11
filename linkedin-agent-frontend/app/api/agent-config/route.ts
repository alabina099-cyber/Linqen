import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

const AI_MODELS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o-mini (Rapide & économique)', color: 'orange', keyEnv: 'OPENAI_API_KEY' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Plus rapide)',      color: 'blue',   keyEnv: 'OPENAI_API_KEY' },
  { value: 'gpt-4',         label: 'GPT-4 (Meilleure qualité)',         color: 'green',  keyEnv: 'OPENAI_API_KEY' },
];

// GET /api/agent-config — returns available models + current model
export async function GET() {
  const openaiAvailable = !!process.env.OPENAI_API_KEY;

  let currentModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  try {
    const result = await query('SELECT settings FROM users LIMIT 1');
    if (result.rows[0]?.settings?.aiModel) {
      currentModel = result.rows[0].settings.aiModel;
    }
  } catch {}

  const models = AI_MODELS.map((m) => ({
    ...m,
    available: m.keyEnv === 'OPENAI_API_KEY' ? openaiAvailable : false,
  }));

  return NextResponse.json({ success: true, currentModel, models });
}

// PUT /api/agent-config — save chosen model to user settings
export async function PUT(request: NextRequest) {
  try {
    const { model } = await request.json();
    const valid = AI_MODELS.map((m) => m.value);
    if (!model || !valid.includes(model)) {
      return NextResponse.json({ error: 'Modèle invalide' }, { status: 400 });
    }

    await query(
      `UPDATE users SET settings = COALESCE(settings, '{}'::jsonb) || $1::jsonb, updated_at = NOW()`,
      [JSON.stringify({ aiModel: model })]
    );

    return NextResponse.json({ success: true, model });
  } catch (error) {
    console.error('PUT /api/agent-config error:', error);
    return NextResponse.json({ error: 'Erreur lors de la sauvegarde' }, { status: 500 });
  }
}
