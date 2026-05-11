import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

// CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// POST /api/auto-reply
// Called by the Chrome extension when a prospect replies to a message.
// If autoReplyEnabled=true in settings, generates a reply and queues it as "approved" (no manual approval needed).
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prospect_name, prospect_url, prospect_message, prospect_id } = body;

    if (!prospect_name || !prospect_message) {
      return NextResponse.json({ error: 'prospect_name et prospect_message sont requis' }, { status: 400 });
    }

    // Read user settings
    const userResult = await query('SELECT settings FROM users LIMIT 1');
    const settings = userResult.rows[0]?.settings || {};
    const aiSettings = settings.ai || {};
    const autoReplyEnabled = aiSettings.autoReplyEnabled === true;

    if (!autoReplyEnabled) {
      return NextResponse.json({ success: true, skipped: true, reason: 'autoReplyEnabled est désactivé' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY manquante' }, { status: 500 });
    }

    // Determine tone label for prompt
    const toneMap: Record<string, string> = {
      professional: 'professionnel et courtois',
      friendly:     'amical et chaleureux',
      formal:       'formel et soutenu',
      casual:       'décontracté et naturel',
    };
    const tone = toneMap[aiSettings.tone || 'professional'] || 'professionnel et courtois';
    const detectLanguage = aiSettings.autoDetectLanguage !== false;
    const aiModel = settings.aiModel || process.env.OPENAI_MODEL || 'gpt-4o-mini';

    // Fetch prospect info from DB if available
    let prospectContext = '';
    if (prospect_id) {
      try {
        const pRes = await query('SELECT name, role, company, industry FROM prospects WHERE id = $1', [prospect_id]);
        if (pRes.rows[0]) {
          const p = pRes.rows[0];
          prospectContext = `\nInfos prospect: ${p.name}, ${p.role || ''} chez ${p.company || ''} (${p.industry || ''}).`;
        }
      } catch {}
    }

    // Generate reply with OpenAI
    const llm = new ChatOpenAI({
      modelName: aiModel,
      temperature: 0.7,
      maxTokens: 500,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    const langInstruction = detectLanguage
      ? 'Détecte automatiquement la langue du message reçu et réponds DANS LA MÊME LANGUE.'
      : 'Réponds en français.';

    const systemPrompt = `Tu es un assistant LinkedIn B2B expert en prospection. 
Ton rôle: répondre automatiquement aux messages des prospects de façon ${tone}.
${langInstruction}
Règles:
- Réponse courte et naturelle (max 200 mots)
- Montre de l'intérêt pour leur situation
- Propose naturellement un échange / call / démo selon le contexte
- Ne commence JAMAIS par "Bonjour Prospect" si le prénom est connu — utilise leur prénom
- N'utilise JAMAIS de formules robotiques ou trop commerciales
- Si la réponse est négative (pas intéressé), remercie poliment et ne relance pas${prospectContext}`;

    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(`Le prospect ${prospect_name} a répondu:\n"${prospect_message}"\n\nRédige une réponse appropriée.`),
    ]);

    const replyText = typeof response.content === 'string'
      ? response.content
      : (response.content as { text?: string }[])[0]?.text || '';

    if (!replyText.trim()) {
      return NextResponse.json({ error: 'Impossible de générer une réponse' }, { status: 500 });
    }

    // Queue action as "approved" — extension picks it up immediately without manual approval
    const actionResult = await query(
      `INSERT INTO linkedin_actions_queue 
         (action_type, target_url, target_name, payload, status, created_at)
       VALUES ('send_message', $1, $2, $3, 'approved', NOW())
       RETURNING id`,
      [
        prospect_url || null,
        prospect_name,
        JSON.stringify({ message: replyText, message_type: 'response', auto_reply: true }),
      ]
    );

    // Update prospect status to 'auto_replied'
    if (prospect_id) {
      try {
        await query(
          `UPDATE prospects SET status = 'auto_replied', updated_at = NOW() WHERE id = $1`,
          [prospect_id]
        );
      } catch {}
    }

    // Save to messages table
    try {
      await query(
        `INSERT INTO messages (prospect_id, recipient_name, message_text, message_type, status, created_at)
         VALUES ($1, $2, $3, 'response', 'approved', NOW())`,
        [prospect_id || null, prospect_name, replyText]
      );
    } catch {}

    return NextResponse.json({
      success: true,
      action_id: actionResult.rows[0].id,
      reply: replyText,
      status: 'approved',
      message: `Réponse auto générée pour ${prospect_name} — envoi direct en cours`,
    });

  } catch (error) {
    console.error('[auto-reply] Erreur:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
