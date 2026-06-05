import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { ensureOwnershipColumns, getRequestUser, getScopeUserIds } from "@/lib/requestAuth";

export async function GET(request: NextRequest) {
  try {
    await ensureOwnershipColumns();
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const scopeIds = await getScopeUserIds(user);
    const isAdmin = user.role === 'admin';

    const actionsScope = isAdmin
      ? '(user_id = ANY($1) OR user_id IS NULL)'
      : 'user_id = ANY($1)';
    const campaignsScope = isAdmin
      ? '(user_id = ANY($1) OR user_id IS NULL)'
      : 'user_id = ANY($1)';

    const [actionsResult, followupsResult, statsResult, campaignsResult, toolStepsResult] = await Promise.all([
      query(
        `SELECT
          id,
          action_type,
          target_url,
          target_name,
          payload,
          status,
          result,
          error_message,
          campaign_id,
          prospect_id,
          created_at,
          executed_at
         FROM linkedin_actions_queue
         WHERE ${actionsScope}
         ORDER BY created_at DESC
         LIMIT 40`,
        [scopeIds]
      ).catch((e) => { console.error("[activity] actionsResult error:", e); return { rows: [] }; }),
      query(
        `SELECT
          sf.id,
          sf.prospect_id,
          sf.campaign_id,
          sf.message_text,
          sf.scheduled_for,
          sf.status,
          sf.created_at,
          p.name as prospect_name,
          c.name as campaign_name
         FROM scheduled_followups sf
         LEFT JOIN prospects p ON sf.prospect_id = p.id
         LEFT JOIN campaigns c ON sf.campaign_id = c.id
         WHERE sf.campaign_id IS NULL OR ${campaignsScope.replace('user_id', 'c.user_id')}
         ORDER BY sf.created_at DESC
         LIMIT 20`,
        [scopeIds]
      ).catch((e) => { console.error("[activity] followupsResult error:", e); return { rows: [] }; }),
      query(
        `SELECT
          COALESCE(COUNT(*) FILTER (WHERE status = 'pending_approval'), 0) as pending_approval,
          COALESCE(COUNT(*) FILTER (WHERE status = 'approved'), 0) as approved,
          COALESCE(COUNT(*) FILTER (WHERE status = 'completed'), 0) as completed,
          COALESCE(COUNT(*) FILTER (WHERE status = 'failed'), 0) as failed,
          COALESCE(COUNT(*) FILTER (WHERE status = 'rejected'), 0) as rejected,
          COALESCE(COUNT(*), 0) as total_actions
         FROM linkedin_actions_queue
         WHERE ${actionsScope}`,
        [scopeIds]
      ).catch((e) => { console.error("[activity] statsResult error:", e); return { rows: [] }; }),
      query(
        `SELECT
          id,
          name,
          description,
          status,
          industry,
          location,
          target_role,
          contacted,
          replied,
          created_at,
          updated_at
         FROM campaigns
         WHERE ${campaignsScope}
         ORDER BY created_at DESC
         LIMIT 20`,
        [scopeIds]
      ).catch((e) => { console.error("[activity] campaignsResult error:", e); return { rows: [] }; }),
      query(
        `SELECT id, conversation_id, tool_name, args, result, status, created_at
         FROM agent_tool_steps
         WHERE conversation_id IN (
           SELECT DISTINCT conversation_id FROM agent_chat_history WHERE ${actionsScope}
         )
         ORDER BY created_at DESC
         LIMIT 50`,
        [scopeIds]
      ).catch((e) => { console.error("[activity] toolStepsResult error:", e); return { rows: [] }; }),
    ]);

    const actionItems = actionsResult.rows.map((row) => ({
      id: `action-${row.id}`,
      itemType: "linkedin_action",
      actionId: row.id,
      actionType: row.action_type,
      title: getActionTitle(row.action_type),
      description: buildActionDescription(row),
      detail: buildActionDetail(row),
      status: row.status,
      statusLabel: getStatusLabel(row.status),
      targetName: row.target_name,
      targetUrl: row.target_url,
      campaignId: row.campaign_id,
      prospectId: row.prospect_id,
      payload: row.payload,
      result: row.result,
      errorMessage: row.error_message,
      createdAt: row.created_at,
      executedAt: row.executed_at,
      priority: getPriority(row.status),
    }));

    const followupItems = followupsResult.rows.map((row) => ({
      id: `followup-${row.id}`,
      itemType: "followup",
      actionId: row.id,
      actionType: "scheduled_followup",
      title: "Relance planifiée",
      description: row.prospect_name
        ? `Relance programmée pour ${row.prospect_name}`
        : "Relance automatique programmée",
      detail: row.message_text,
      status: row.status,
      statusLabel: getStatusLabel(row.status),
      targetName: row.prospect_name,
      targetUrl: null,
      campaignId: row.campaign_id,
      prospectId: row.prospect_id,
      payload: { scheduled_for: row.scheduled_for, campaign_name: row.campaign_name },
      result: null,
      errorMessage: null,
      createdAt: row.created_at,
      executedAt: row.scheduled_for,
      priority: row.status === "scheduled" ? "medium" : "low",
    }));

    const campaignItems = campaignsResult.rows.map((row) => ({
      id: `campaign-${row.id}`,
      itemType: "campaign" as const,
      actionId: row.id,
      actionType: "create_campaign",
      title: `Campagne: ${row.name}`,
      description: buildCampaignDescription(row),
      detail: buildCampaignDetail(row),
      status: row.status || "draft",
      statusLabel: getCampaignStatusLabel(row.status),
      targetName: row.target_role || null,
      targetUrl: null,
      campaignId: row.id,
      prospectId: null,
      payload: { industry: row.industry, location: row.location },
      result: { contacted: row.contacted, replied: row.replied },
      errorMessage: null,
      createdAt: row.created_at,
      executedAt: row.updated_at,
      priority: row.status === "active" ? "high" as const : "medium" as const,
    }));

    const toolStepItems = toolStepsResult.rows.map((row: any) => {
      const args = typeof row.args === "string" ? JSON.parse(row.args) : row.args;
      return {
        id: `step-${row.id}`,
        itemType: "tool_step" as const,
        actionId: row.id,
        actionType: row.tool_name,
        title: getToolStepTitle(row.tool_name),
        description: getToolStepDescription(row.tool_name, args, row.status),
        detail: buildToolStepDetail(row.tool_name, args, row.result),
        status: row.status === "success" ? "success" : "failed",
        statusLabel: row.status === "success" ? "Succès" : "Erreur",
        targetName: args?.prospect_name || args?.name || null,
        targetUrl: args?.linkedin_url || args?.url || null,
        campaignId: args?.campaign_id || null,
        prospectId: null,
        payload: args,
        result: row.result,
        errorMessage: row.status === "error" ? row.result : null,
        createdAt: row.created_at,
        executedAt: row.created_at,
        priority: "medium" as const,
      };
    });

    const timeline = [...actionItems, ...followupItems, ...campaignItems, ...toolStepItems]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50);

    const stats = statsResult.rows[0] || {
      pending_approval: 0,
      approved: 0,
      completed: 0,
      failed: 0,
      rejected: 0,
      total_actions: 0,
    };

    return NextResponse.json({
      success: true,
      timeline,
      stats: {
        pendingApproval: Number(stats.pending_approval || 0),
        approved: Number(stats.approved || 0),
        completed: Number(stats.completed || 0),
        failed: Number(stats.failed || 0),
        rejected: Number(stats.rejected || 0),
        totalActions: Number(stats.total_actions || 0),
        scheduledFollowups: followupItems.filter((item) => item.status === "scheduled").length,
      },
    });
  } catch (error) {
    console.error("Agent activity API error:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la récupération de l'activité de l'agent" },
      { status: 500 }
    );
  }
}

function getActionTitle(actionType: string) {
  const titles: Record<string, string> = {
    search: "Recherche LinkedIn",
    search_and_message: "Recherche et Envoi de message",
    visit_profile: "Analyse de profil",
    send_connection: "Demande de connexion",
    send_message: "Envoi de message",
    scheduled_followup: "Relance planifiée",
  };

  return titles[actionType] || actionType;
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "En attente",
    pending_approval: "En attente",
    approved: "Approuvée",
    processing: "En cours",
    completed: "Terminée",
    failed: "Échouée",
    stopped: "Arrêtée",
    rejected: "Rejetée",
    scheduled: "Planifiée",
    sent: "Envoyée",
    cancelled: "Annulée",
  };

  return labels[status] || status;
}

function getPriority(status: string) {
  if (status === "pending_approval" || status === "failed") return "high";
  if (status === "approved" || status === "processing" || status === "scheduled") return "medium";
  return "low";
}

function buildActionDescription(row: any) {
  return null;
}

function buildActionDetail(row: any) {
  const payload = normalizeJson(row.payload);
  const result = normalizeJson(row.result);
  const details: string[] = [];

  if (payload?.keywords) details.push(`Recherche: ${payload.keywords}`);
  if (payload?.limit) details.push(`Limite: ${payload.limit}`);
  if (row.target_name) details.push(`Cible: ${row.target_name}`);
  if (payload?.note) details.push(`Note: ${payload.note}`);
  if (payload?.message) details.push(`Message: ${payload.message}`);
  if (payload?.message_template) details.push(`Message: ${payload.message_template}`);
  if (result?.profile?.company) details.push(`Entreprise: ${result.profile.company}`);
  if (result?.messages_sent !== undefined) details.push(`Messages envoyés: ${result.messages_sent}`);
  if (result?.profiles_found !== undefined) details.push(`Profils trouvés: ${result.profiles_found}`);

  return details.join("\n") || null;
}

function buildCampaignDescription(row: any) {
  if (row.status === "active") {
    return `Campagne active avec ${row.contacted || 0} prospects contactés et ${row.replied || 0} réponses.`;
  }
  if (row.status === "paused") {
    return `Campagne en pause. Vous pouvez la réactiver via l'agent ou la page Campagnes.`;
  }
  if (row.status === "completed") {
    return `Campagne terminée. ${row.contacted || 0} prospects contactés, ${row.replied || 0} réponses reçues.`;
  }
  return `Campagne créée par l'agent et en attente d'activation. Demandez à l'agent de l'activer ou utilisez la page Campagnes.`;
}

function buildCampaignDetail(row: any) {
  const details: string[] = [];
  if (row.description) details.push(row.description);
  if (row.industry) details.push(`Secteur: ${row.industry}`);
  if (row.location) details.push(`Zone: ${row.location}`);
  if (row.target_role) details.push(`Cible: ${row.target_role}`);
  return details.join(" • ") || "Aucun détail complémentaire.";
}

function getCampaignStatusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: "Brouillon",
    active: "Active",
    paused: "En pause",
    completed: "Terminée",
  };
  return labels[status] || status;
}

function getToolStepTitle(toolName: string) {
  const titles: Record<string, string> = {
    create_campaign: "Étape: Création de campagne",
    update_campaign: "Étape: Mise à jour campagne",
    linkedin_search: "Étape: Recherche LinkedIn",
    linkedin_visit_profile: "Étape: Visite de profil",
    linkedin_send_connection: "Étape: Demande de connexion",
    linkedin_send_message: "Étape: Envoi de message",
    analyze_prospect: "Étape: Analyse de prospect",
    generate_message: "Étape: Génération de message",
    suggest_strategy: "Étape: Suggestion de stratégie",
    search_prospects_db: "Étape: Analyse de la liste de prospects",
    check_network_connections: "Étape: Vérification des connexions réseau",
    get_connection_results: "Étape: Résultats des connexions réseau",
    save_prospect: "Étape: Sauvegarde prospect",
    get_campaign_stats: "Étape: Stats campagne",
    schedule_followup: "Étape: Planification relance",
    get_rate_limits: "Étape: Vérification limites",
  };
  return titles[toolName] || `Étape: ${toolName}`;
}

function getToolStepDescription(toolName: string, args: any, status: string) {
  const statusText = status === "success" ? "réussie" : "échouée";
  if (toolName === "create_campaign") return `Création de la campagne "${args?.name || ""}" — ${statusText}`;
  if (toolName === "linkedin_search") return `Recherche: "${args?.keywords || ""}" — ${statusText}`;
  if (toolName === "linkedin_send_connection") return `Connexion à ${args?.prospect_name || args?.linkedin_url || "prospect"} — ${statusText}`;
  if (toolName === "linkedin_send_message") return `Message à ${args?.prospect_name || "prospect"} — ${statusText}`;
  if (toolName === "analyze_prospect") return `Analyse du profil ${args?.linkedin_url || ""} — ${statusText}`;
  if (toolName === "generate_message") return `Rédaction d'un message ${args?.message_type || ""} — ${statusText}`;
  if (toolName === "suggest_strategy") return `Élaboration d'une stratégie de prospection — ${statusText}`;
  if (toolName === "save_prospect") return `Sauvegarde de ${args?.name || "prospect"} en base — ${statusText}`;
  if (toolName === "search_prospects_db") return `Analyse de la liste de prospects en base de données — ${statusText}`;
  if (toolName === "check_network_connections") {
    const names = args?.prospect_names;
    const count = Array.isArray(names) ? names.length : "?";
    return `Vérification réseau lancée pour ${count} prospect(s) via l'extension Chrome — ${statusText}`;
  }
  if (toolName === "get_connection_results") return `Récupération des résultats de connexion LinkedIn — ${statusText}`;
  if (toolName === "get_campaign_stats") return `Récupération des statistiques — ${statusText}`;
  if (toolName === "schedule_followup") return `Planification d'une relance — ${statusText}`;
  return `Exécution de ${toolName} — ${statusText}`;
}

function buildToolStepDetail(toolName: string, args: any, result: string) {
  const details: string[] = [];
  if (args) {
    for (const [key, value] of Object.entries(args)) {
      if (value && typeof value === "string" && value.length < 200) {
        details.push(`${key}: ${value}`);
      }
    }
  }
  // Try to extract a summary from the result
  try {
    const parsed = JSON.parse(result);
    if (toolName === "check_network_connections" && parsed.summary) {
      details.push(parsed.summary);
    } else if (parsed.message) {
      details.push(`Résultat: ${parsed.message}`);
    } else if (parsed.summary) {
      details.push(parsed.summary);
    } else if (parsed.success !== undefined) {
      details.push(`Succès: ${parsed.success ? "Oui" : "Non"}`);
    }
  } catch {
    if (result && result.length < 300) details.push(`Résultat: ${result.substring(0, 200)}`);
  }
  return details.join(" • ") || "Étape intermédiaire de l'agent.";
}

function normalizeJson(value: unknown) {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value as Record<string, unknown>;
}
