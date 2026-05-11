import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// POST /api/campaigns/[id]/execute — Lancer une campagne : créer des actions LinkedIn automatiquement
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    // Récupérer la campagne
    const campaignResult = await query(`SELECT * FROM campaigns WHERE id = $1`, [id]);
    if (campaignResult.rows.length === 0) {
      return NextResponse.json({ error: "Campagne non trouvée" }, { status: 404 });
    }

    const campaign = campaignResult.rows[0];

    // Autoriser draft et active. La campagne sera activée automatiquement à l'approbation.
    if (!["draft", "active"].includes(campaign.status)) {
      return NextResponse.json(
        { error: `La campagne ne peut pas être exécutée dans le statut '${campaign.status}'` },
        { status: 400 }
      );
    }

    // Construire l'URL de recherche LinkedIn à partir des critères
    const searchKeywords: string[] = [];
    
    if (campaign.target_role) {
      // Prendre le premier rôle comme mot-clé principal
      const roles = campaign.target_role.split(",").map((r: string) => r.trim());
      searchKeywords.push(...roles);
    }
    
    if (campaign.industry) {
      searchKeywords.push(campaign.industry);
    }

    if (searchKeywords.length === 0) {
      return NextResponse.json(
        { error: "La campagne n'a pas de critères de ciblage (rôle ou industrie)" },
        { status: 400 }
      );
    }

    // Construire l'URL de recherche LinkedIn People
    const keywordsParam = encodeURIComponent(searchKeywords.join(" "));
    let searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${keywordsParam}&origin=SWITCH_SEARCH_VERTICAL`;

    // Ajouter la localisation si disponible (via network param)
    if (campaign.location) {
      searchUrl += `&geoUrn=[]`; // LinkedIn gère le filtre via keywords pour les recherches simples
      // Ajouter la localisation aux keywords pour un meilleur ciblage
      const locationKeyword = encodeURIComponent(campaign.location.split(",")[0].trim());
      searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${keywordsParam}+${locationKeyword}&origin=SWITCH_SEARCH_VERTICAL`;
    }

    // Déterminer le type d'action selon campaign_type
    const campaignType = campaign.campaign_type || 'messages';
    const actionType = campaignType === 'connections_only' ? 'search_and_connection' : 'search_and_message';

    // Construire le template de message (uniquement pour type messages)
    let messageTemplate = null;
    if (campaignType === 'messages') {
      messageTemplate = campaign.template_invitation;
      
      if (!messageTemplate) {
        // Template par défaut si aucun n'est défini
        messageTemplate = `Bonjour {name},\n\nJ'ai remarqué votre profil et votre expertise chez {company}. Je travaille sur une solution qui pourrait vous intéresser.\n\nSeriez-vous disponible pour un échange rapide ?\n\nCordialement`;
      }

      // Normaliser les variables du template vers le format {name} attendu par l'extension
      messageTemplate = messageTemplate
        .replace(/\{\{name\}\}/g, "{name}")
        .replace(/\{\{company\}\}/g, "{company}")
        .replace(/\{\{role\}\}/g, "{role}")
        .replace(/\{firstName\}/g, "{name}")
        .replace(/\{\{firstName\}\}/g, "{name}")
        .replace(/\{prénom\}/g, "{name}")
        .replace(/\{nom\}/g, "{name}")
        .replace(/\{entreprise\}/g, "{company}")
        .replace(/\{poste\}/g, "{role}");
    }

    // Vérifier s'il y a déjà une action en cours pour cette campagne
    const existingActions = await query(
      `SELECT id, status FROM linkedin_actions_queue 
       WHERE campaign_id = $1 AND status IN ('pending_approval', 'approved', 'processing')
       LIMIT 1`,
      [id]
    );

    if (existingActions.rows.length > 0) {
      return NextResponse.json({
        success: true,
        message: "Une action est déjà en cours pour cette campagne",
        existing_action: existingActions.rows[0],
      });
    }

    // Créer l'action dans la queue selon le type de campagne
    const dailyLimit = campaign.daily_limit || 20;
    const actionResult = await query(
      `INSERT INTO linkedin_actions_queue 
       (action_type, target_url, target_name, payload, status, campaign_id, created_at)
       VALUES ($1, $2, $3, $4, 'pending_approval', $5, NOW())
       RETURNING *`,
      [
        actionType,
        searchUrl,
        `Campagne: ${campaign.name}`,
        JSON.stringify({
          message_template: messageTemplate,
          campaign_type: campaignType,
          campaign_id: id,
          campaign_name: campaign.name,
          target_role: campaign.target_role,
          industry: campaign.industry,
          location: campaign.location,
          company_size: campaign.company_size,
          daily_limit: dailyLimit,
          follow_up_days: campaign.follow_up_days || 3,
        }),
        id,
      ]
    );

    // Si la campagne a aussi un template de follow-up, planifier un follow-up
    if (campaign.template_followup && campaign.follow_up_days) {
      // Le follow-up sera géré après que les premiers messages soient envoyés
      // On le note dans le payload pour référence future
    }

    const actionLabel = campaignType === 'connections_only' ? "d'envoi de connexions" : "de prospection";
    return NextResponse.json({
      success: true,
      message: `Action ${actionLabel} créée pour la campagne "${campaign.name}". Elle apparaîtra dans la file d'approbation.`,
      action: actionResult.rows[0],
      search_url: searchUrl,
      ...(messageTemplate ? { template_preview: messageTemplate.substring(0, 100) + "..." } : {}),
    });
  } catch (error) {
    console.error("POST /api/campaigns/[id]/execute error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'exécution de la campagne" },
      { status: 500 }
    );
  }
}
