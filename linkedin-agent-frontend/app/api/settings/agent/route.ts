import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getRequestUser } from '@/lib/requestAuth';

// CORS — extension Chrome needs this
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// GET /api/settings/agent
// Returns all agent settings to be consumed by the Chrome extension.
export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    let result;
    if (user) {
      result = await query('SELECT settings FROM users WHERE id = $1', [user.userId]);
    } else {
      // Fallback admin pour l'extension Chrome (qui n'a pas de JWT)
      result = await query("SELECT settings FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1");
    }
    const settings = result.rows[0]?.settings || {};
    const automation = settings.automation || {};
    const ai = settings.ai || {};

    const agentSettings = {
      // Delays (seconds) — extension converts to ms
      minDelayBetweenActions: automation.minDelayBetweenActions ?? 30,
      maxDelayBetweenActions: automation.maxDelayBetweenActions ?? 120,
      randomizeDelays:        automation.randomizeDelays        ?? true,
      simulateHumanBehavior:  automation.simulateHumanBehavior  ?? true,

      // Working hours
      workingHoursStart: automation.workingHoursStart || '09:00',
      workingHoursEnd:   automation.workingHoursEnd   || '18:00',
      timezone:          automation.timezone           || 'Europe/Paris (UTC+1)',
      workingDays:       automation.workingDays        || ['Mon','Tue','Wed','Thu','Fri'],

      // AI behavior
      autoReplyEnabled:    ai.autoReplyEnabled    ?? false,
      autoDetectLanguage:  ai.autoDetectLanguage  ?? true,
      sentimentAnalysis:   ai.sentimentAnalysis   ?? false,
      smartFollowUp:       ai.smartFollowUp       ?? false,
      tone:                ai.tone                || 'professional',
      aiModel:             settings.aiModel       || process.env.OPENAI_MODEL || 'gpt-4o-mini',
    };

    return NextResponse.json(
      { success: true, settings: agentSettings },
      { headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (error) {
    console.error('[settings/agent] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
