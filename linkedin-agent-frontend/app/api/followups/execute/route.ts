import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getRequestUser } from "@/lib/requestAuth";
import { checkRateLimit } from "@/lib/rate-limiter";

// POST /api/followups/execute — Exécuter les relances planifiées
export async function POST(request: NextRequest) {
  try {
    const requestUser = await getRequestUser(request);
    const userId = requestUser?.userId ?? null;

    // Charger les settings de l'utilisateur courant (fallback admin pour cron/extension)
    const settingsResult = userId
      ? await query('SELECT settings FROM users WHERE id = $1', [userId])
      : await query("SELECT settings FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1");
    const settings = settingsResult.rows[0]?.settings || {};
    const smartFollowUpEnabled = settings.ai?.smartFollowUp === true;

    // Récupérer les relances planifiées pour aujourd'hui
    const followupsResult = await query(
      `SELECT sf.*, p.name, p.linkedin_url, p.notes, c.name as campaign_name, c.template_followup
       FROM scheduled_followups sf
       INNER JOIN prospects p ON sf.prospect_id = p.id
       INNER JOIN campaigns c ON sf.campaign_id = c.id
       WHERE sf.status = 'scheduled'
         AND sf.scheduled_for <= NOW()
         AND c.status = 'active'
       ORDER BY sf.scheduled_for ASC
       LIMIT 50`
    );

    const followups = followupsResult.rows;
    const executed = [];
    const skipped = [];

    for (const followup of followups) {
      try {
        // Vérifier si le prospect a répondu depuis la planification
        const prospectStatusResult = await query(
          `SELECT status, notes FROM prospects WHERE id = $1`,
          [followup.prospect_id]
        );
        const prospectStatus = prospectStatusResult.rows[0]?.status;
        const prospectNotes: string = prospectStatusResult.rows[0]?.notes || '';

        // Si le prospect a répondu ou est déjà converti, annuler la relance
        if (
          prospectStatus === 'replied' ||
          prospectStatus === 'converted' ||
          prospectStatus === 'auto_replied' ||
          prospectStatus === 'responded'
        ) {
          await query(
            `UPDATE scheduled_followups SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
            [followup.id]
          );
          skipped.push({
            followup_id: followup.id,
            prospect_name: followup.name,
            reason: `Prospect déjà ${prospectStatus}`,
          });
          continue;
        }

        // Smart Follow-Up: annuler si le prospect a un sentiment négatif détecté
        if (smartFollowUpEnabled && prospectNotes.includes('[Sentiment: negative')) {
          await query(
            `UPDATE scheduled_followups SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
            [followup.id]
          );
          skipped.push({
            followup_id: followup.id,
            prospect_name: followup.name,
            reason: 'Smart Follow-Up: sentiment négatif détecté — relance annulée automatiquement',
          });
          continue;
        }

        // Vérifier le rate limiter pour les messages
        const rateLimit = await checkRateLimit("send_message");
        if (!rateLimit.allowed) {
          console.log(`Rate limit atteint: ${rateLimit.reason}`);
          skipped.push({
            followup_id: followup.id,
            prospect_name: followup.name,
            reason: rateLimit.reason,
          });
          continue;
        }

        // Créer l'action LinkedIn pour envoyer le message de relance
        // Les relances programmées sont automatiquement approuvées (processus automatisé)
        const actionResult = await query(
          `INSERT INTO linkedin_actions_queue 
           (action_type, target_url, target_name, payload, status, campaign_id, created_at)
           VALUES ($1, $2, $3, $4, 'approved', $5, NOW())
           RETURNING *`,
          [
            'send_message',
            followup.linkedin_url,
            `Relance: ${followup.name}`,
            JSON.stringify({
              message_template: followup.message_text,
              campaign_id: followup.campaign_id,
              campaign_name: followup.campaign_name,
              followup_id: followup.id,
              is_followup: true,
            }),
            followup.campaign_id,
          ]
        );

        // Marquer la relance comme exécutée
        await query(
          `UPDATE scheduled_followups SET status = 'executed', updated_at = NOW() WHERE id = $1`,
          [followup.id]
        );

        // Mettre à jour le statut du prospect
        await query(
          `UPDATE prospects SET status = 'followup_sent', last_contacted_at = NOW(), updated_at = NOW() WHERE id = $1`,
          [followup.prospect_id]
        );

        executed.push({
          followup_id: followup.id,
          prospect_name: followup.name,
          action_id: actionResult.rows[0].id,
        });
      } catch (error) {
        console.error(`Erreur lors de l'exécution de la relance ${followup.id}:`, error);
        skipped.push({
          followup_id: followup.id,
          prospect_name: followup.name,
          reason: 'Erreur lors de l\'exécution',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `${executed.length} relance(s) exécutée(s), ${skipped.length} ignorée(s)`,
      executed,
      skipped,
    });
  } catch (error) {
    console.error("POST /api/followups/execute error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'exécution des relances" },
      { status: 500 }
    );
  }
}
