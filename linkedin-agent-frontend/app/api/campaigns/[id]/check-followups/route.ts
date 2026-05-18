import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limiter";

// POST /api/campaigns/[id]/check-followups — Vérifier et planifier les relances pour une campagne
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const campaignId = parseInt(idStr);
    if (isNaN(campaignId)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    // Récupérer la campagne
    const campaignResult = await query(
      `SELECT * FROM campaigns WHERE id = $1 AND status = 'active'`,
      [campaignId]
    );

    if (campaignResult.rows.length === 0) {
      return NextResponse.json({ error: "Campagne non trouvée ou non active" }, { status: 404 });
    }

    const campaign = campaignResult.rows[0];
    const followUpDays = campaign.follow_up_days || 3;
    const dailyLimit = campaign.daily_limit || 20;

    // Vérifier les actions déjà exécutées aujourd'hui pour cette campagne
    const todayActionsResult = await query(
      `SELECT COUNT(*) as count
       FROM linkedin_actions_queue
       WHERE campaign_id = $1
         AND status = 'completed'
         AND executed_at >= CURRENT_DATE`,
      [campaignId]
    );
    const todayActions = parseInt(todayActionsResult.rows[0].count);

    if (todayActions >= dailyLimit) {
      return NextResponse.json({
        success: true,
        message: `Limite journalière atteinte pour cette campagne (${todayActions}/${dailyLimit})`,
        followups_scheduled: 0,
      });
    }

    // Trouver les prospects qui ont reçu un message mais n'ont pas répondu
    // et pour lesquels aucune relance n'est planifiée
    const prospectsResult = await query(
      `SELECT DISTINCT p.id, p.name, p.linkedin_url, p.status, p.last_contacted_at
       FROM prospects p
       INNER JOIN linkedin_actions_queue laq ON p.linkedin_url = laq.target_url
       WHERE laq.campaign_id = $1
         AND laq.action_type = 'send_message'
         AND laq.status = 'completed'
         AND p.status IN ('messaged', 'replied')
         AND p.last_contacted_at < NOW() - INTERVAL '${followUpDays} days'
         AND NOT EXISTS (
           SELECT 1 FROM scheduled_followups sf
           WHERE sf.prospect_id = p.id
             AND sf.campaign_id = $1
             AND sf.status = 'scheduled'
         )
       ORDER BY p.last_contacted_at ASC
       LIMIT ${dailyLimit - todayActions}`,
      [campaignId]
    );

    const prospects = prospectsResult.rows;
    const followupsScheduled = [];

    // Pour chaque prospect, planifier une relance
    for (const prospect of prospects) {
      // Vérifier le rate limiter pour les follow-ups
      const rateLimit = await checkRateLimit("schedule_followup");
      if (!rateLimit.allowed) {
        console.log(`Rate limit atteint pour les follow-ups: ${rateLimit.reason}`);
        break;
      }

      // Créer le template de relance
      const followupTemplate = campaign.template_followup || 
        `Bonjour {name},\n\nJe reviens vers vous concernant mon message précédent. Avez-vous eu un moment pour y réfléchir ?\n\nJe reste disponible pour en discuter si cela vous intéresse.\n\nCordialement`;

      // Remplacer les variables
      const messageText = followupTemplate
        .replace(/{name}/g, prospect.name || "là")
        .replace(/{company}/g, "")
        .replace(/{role}/g, "");

      // Planifier la relance pour demain
      const scheduledFor = new Date();
      scheduledFor.setDate(scheduledFor.getDate() + 1);
      scheduledFor.setHours(10, 0, 0, 0); // 10h du matin

      // Insérer dans scheduled_followups
      const followupResult = await query(
        `INSERT INTO scheduled_followups (prospect_id, campaign_id, message_text, scheduled_for, status, created_at)
         VALUES ($1, $2, $3, $4, 'scheduled', NOW())
         RETURNING *`,
        [prospect.id, campaignId, messageText, scheduledFor]
      );

      followupsScheduled.push({
        prospect_id: prospect.id,
        prospect_name: prospect.name,
        scheduled_for: scheduledFor,
        followup_id: followupResult.rows[0].id,
      });

      // Mettre à jour le statut du prospect
      await query(
        `UPDATE prospects SET status = 'followup_scheduled', updated_at = NOW() WHERE id = $1`,
        [prospect.id]
      );
    }

    return NextResponse.json({
      success: true,
      message: `${followupsScheduled.length} relance(s) planifiée(s) pour la campagne "${campaign.name}"`,
      followups_scheduled: followupsScheduled.length,
      followups: followupsScheduled,
      daily_limit: dailyLimit,
      today_actions: todayActions,
      remaining_today: dailyLimit - todayActions - followupsScheduled.length,
    });
  } catch (error) {
    console.error("POST /api/campaigns/[id]/check-followups error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la vérification des relances" },
      { status: 500 }
    );
  }
}
