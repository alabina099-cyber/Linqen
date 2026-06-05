import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getRequestUser } from '@/lib/requestAuth';
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

    // Read current user's settings (fallback admin for Chrome extension)
    const requestUser = await getRequestUser(request);
    const userId = requestUser?.userId ?? null;
    const settingsResult = userId
      ? await query('SELECT settings FROM users WHERE id = $1', [userId])
      : await query("SELECT settings FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1");
    const settings = settingsResult.rows[0]?.settings || {};
    const aiSettings = settings.ai || {};
    const autoReplyEnabled = aiSettings.autoReplyEnabled === true;

    if (!autoReplyEnabled) {
      return NextResponse.json({ success: true, skipped: true, reason: 'autoReplyEnabled est désactivé' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY manquante' }, { status: 500 });
    }

    const toneMap: Record<string, string> = {
      professional: 'professionnel et courtois',
      friendly:     'amical et chaleureux',
      formal:       'formel et soutenu',
      casual:       'décontracté et naturel',
    };
    const tone = toneMap[aiSettings.tone || 'professional'] || 'professionnel et courtois';
    const detectLanguage = aiSettings.autoDetectLanguage !== false;
    const sentimentAnalysisEnabled = aiSettings.sentimentAnalysis === true;
    const aiModel = settings.aiModel || process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const llm = new ChatOpenAI({
      modelName: aiModel,
      temperature: 0.3,
      maxTokens: 600,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    // ─── Sentiment Analysis ───────────────────────────────────────────────
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    let sentimentScore = 0;
    let sentimentReason = '';

    if (sentimentAnalysisEnabled) {
      try {
        const sentimentResponse = await llm.invoke([
          new SystemMessage(
            'Tu es un expert en analyse de sentiment pour des messages LinkedIn B2B. ' +
            'Réponds UNIQUEMENT avec un JSON valide: {"sentiment":"positive"|"neutral"|"negative","score":-1..1,"reason":"courte explication en français"}'
          ),
          new HumanMessage(`Analyse le sentiment de ce message LinkedIn:\n"${prospect_message}"`),
        ]);
        const raw = typeof sentimentResponse.content === 'string'
          ? sentimentResponse.content
          : (sentimentResponse.content as { text?: string }[])[0]?.text || '{}';
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          sentiment = parsed.sentiment || 'neutral';
          sentimentScore = typeof parsed.score === 'number' ? parsed.score : 0;
          sentimentReason = parsed.reason || '';
        }
      } catch {
        sentiment = 'neutral';
      }

      // Save sentiment to prospect record
      if (prospect_id) {
        try {
          await query(
            `UPDATE prospects 
             SET notes = COALESCE(notes, '') || $1,
                 updated_at = NOW()
             WHERE id = $2`,
            [
              `\n[Sentiment: ${sentiment} (${sentimentScore > 0 ? '+' : ''}${sentimentScore.toFixed(2)}) — ${sentimentReason}]`,
              prospect_id,
            ]
          );
        } catch {}
      }

      // Negative sentiment: skip auto-reply, flag for manual review
      if (sentiment === 'negative') {
        return NextResponse.json({
          success: true,
          skipped: true,
          sentiment,
          sentiment_score: sentimentScore,
          reason: `Sentiment négatif détecté (${sentimentReason}). Réponse automatique désactivée — revue manuelle recommandée.`,
        });
      }
    }

    // ─── Fetch prospect context ───────────────────────────────────────────
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

    // ─── Generate auto-reply ──────────────────────────────────────────────
    const langInstruction = detectLanguage
      ? 'Détecte automatiquement la langue du message reçu et réponds DANS LA MÊME LANGUE.'
      : 'Réponds en français.';

    const sentimentContext = sentimentAnalysisEnabled
      ? `\nLe sentiment du message est ${sentiment} — adapte le ton en conséquence.`
      : '';

    const systemPrompt = `Tu es un assistant LinkedIn B2B expert en prospection. 
Ton rôle: répondre automatiquement aux messages des prospects de façon ${tone}.
${langInstruction}${sentimentContext}
Règles:
- Réponse courte et naturelle (max 200 mots)
- Montre de l'intérêt pour leur situation
- Propose naturellement un échange / call / démo selon le contexte
- Ne commence JAMAIS par "Bonjour Prospect" si le prénom est connu — utilise leur prénom
- N'utilise JAMAIS de formules robotiques ou trop commerciales
- Si la réponse est négative (pas intéressé), remercie poliment et ne relance pas${prospectContext}`;

    const replyLlm = new ChatOpenAI({
      modelName: aiModel,
      temperature: 0.7,
      maxTokens: 500,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
    const response = await replyLlm.invoke([
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
      ...(sentimentAnalysisEnabled ? { sentiment, sentiment_score: sentimentScore } : {}),
      message: `Réponse auto générée pour ${prospect_name} — envoi direct en cours`,
    });

  } catch (error) {
    console.error('[auto-reply] Erreur:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
