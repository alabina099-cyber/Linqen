import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { pool, insertLinkedInAction } from "./db";
import { checkRateLimit, getRateLimitStatus, formatRateLimitStatus } from "./rate-limiter";

// =============================================
// CATÉGORIE 1: ACTIONS LINKEDIN (via Chrome Extension)
// =============================================

// TOOL: Rechercher des profils sur LinkedIn
export const linkedinSearchTool = new DynamicStructuredTool({
  name: "linkedin_search",
  description: "Rechercher des profils sur LinkedIn selon des critères et optionnellement préparer un message à envoyer aux profils trouvés. Utiliser network='F' pour chercher dans les connexions 1er degré. Quand l'utilisateur veut aussi envoyer un message, inclure message_template pour que les messages soient automatiquement créés (en pending_approval) dès que la recherche est terminée.",
  schema: z.object({
    keywords: z.string().describe("Mots-clés de recherche (ex: 'ingénieur intelligence artificielle', 'CEO SaaS Paris')"),
    role: z.string().optional().describe("Poste ciblé (ex: CEO, CTO, Directeur Commercial, Ingénieur IA)"),
    location: z.string().optional().describe("Localisation (ex: Paris, France)"),
    industry: z.string().optional().describe("Secteur (ex: Technology, Finance)"),
    company_size: z.string().optional().describe("Taille entreprise (ex: 11-50, 51-200)"),
    network: z.enum(["F", "S", "O"]).optional().describe("Filtre réseau: F=1er degré (mes connexions), S=2e degré, O=3e degré+. UTILISER 'F' pour chercher dans mon réseau."),
    limit: z.number().default(10).describe("Nombre max de profils à récupérer"),
    message_template: z.string().optional().describe("Message à envoyer aux profils trouvés. Peut contenir {name}, {role}, {company}. Si fourni, des actions send_message seront automatiquement créées en pending_approval dès que la recherche est terminée."),
  }),
  func: async ({ keywords, role, location, industry, company_size, network, limit, message_template }) => {
    try {
      const searchUrl = buildLinkedInSearchUrl({ keywords, role, location, industry, company_size, network });

      // Vérifier les limites LinkedIn
      const rateLimit = await checkRateLimit("search");
      if (!rateLimit.allowed) {
        return JSON.stringify({
          success: false,
          rate_limited: true,
          error: rateLimit.reason,
          daily_used: rateLimit.dailyUsed,
          daily_max: rateLimit.dailyMax,
          hourly_used: rateLimit.hourlyUsed,
          hourly_max: rateLimit.hourlyMax,
        });
      }
      
      // Si message_template est fourni → action search_and_message (tout en un)
      // Sinon → action search classique
      const actionType = message_template ? 'search_and_message' : 'search';
      
      const actionId = await insertLinkedInAction({
        action_type: actionType,
        target_url: searchUrl,
        payload: { keywords, role, location, industry, company_size, network, limit, save_as_prospects: true, message_template: message_template || null },
      });

      const actionLabel = message_template 
        ? `Rechercher "${keywords}" et envoyer un message aux profils trouvés`
        : `Rechercher "${keywords}"`;

      return JSON.stringify({
        success: true,
        action_id: actionId,
        search_url: searchUrl,
        status: "pending_approval",
        requires_approval: true,
        message: `✅ Action créée en attente d'approbation. Action #${actionId} : ${actionLabel}${network === 'F' ? ' (dans mon réseau 1er degré)' : ''}. Approuvez dans l'onglet "Approbations" — une seule approbation suffit, tout le reste est automatique.`,
        search_action_id: actionId,
        daily_remaining: rateLimit.remainingToday,
        daily_used: rateLimit.dailyUsed + 1,
        daily_max: rateLimit.dailyMax,
      });
    } catch (error) {
      return JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erreur" });
    }
  },
});

// TOOL: Visiter un profil LinkedIn et récupérer les infos
export const linkedinVisitProfileTool = new DynamicStructuredTool({
  name: "linkedin_visit_profile",
  description: "Visiter un profil LinkedIn pour récupérer les informations détaillées du prospect. L'action est mise en queue pour l'extension Chrome.",
  schema: z.object({
    linkedin_url: z.string().describe("URL du profil LinkedIn (ex: https://linkedin.com/in/username)"),
    prospect_name: z.string().optional().describe("Nom du prospect si connu"),
  }),
  func: async ({ linkedin_url, prospect_name }) => {
    try {
      // Vérifier les limites LinkedIn
      const rateLimit = await checkRateLimit("visit_profile");
      if (!rateLimit.allowed) {
        return JSON.stringify({
          success: false,
          rate_limited: true,
          error: rateLimit.reason,
          daily_used: rateLimit.dailyUsed,
          daily_max: rateLimit.dailyMax,
          hourly_used: rateLimit.hourlyUsed,
          hourly_max: rateLimit.hourlyMax,
        });
      }

      const actionId = await insertLinkedInAction({
        action_type: 'visit_profile',
        target_url: linkedin_url,
        target_name: prospect_name || null,
        payload: {},
      });

      return JSON.stringify({
        success: true,
        action_id: actionId,
        status: "pending_approval",
        requires_approval: true,
        message: `✅ Visite du profil ${prospect_name || linkedin_url} créée et en attente de votre approbation. Action #${actionId}. Allez dans l'onglet "Approbations" pour approuver.`,
        daily_remaining: rateLimit.remainingToday,
        daily_used: rateLimit.dailyUsed + 1,
        daily_max: rateLimit.dailyMax,
      });
    } catch (error) {
      return JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erreur" });
    }
  },
});

// TOOL: Envoyer une demande de connexion LinkedIn
export const linkedinSendConnectionTool = new DynamicStructuredTool({
  name: "linkedin_send_connection",
  description: "Envoyer une demande de connexion LinkedIn avec une note personnalisée. L'action est mise en queue pour l'extension Chrome. Limite: 80 connexions/jour.",
  schema: z.object({
    linkedin_url: z.string().describe("URL du profil LinkedIn"),
    prospect_name: z.string().describe("Nom du prospect"),
    note: z.string().max(300).describe("Note de connexion personnalisée (max 300 caractères)"),
    campaign_id: z.number().optional().describe("ID de la campagne associée"),
  }),
  func: async ({ linkedin_url, prospect_name, note, campaign_id }) => {
    try {
      const normalizedUrl = normalizeLinkedInUrl(linkedin_url);
      // Vérifier les limites LinkedIn (quotidienne + horaire + délai)
      const rateLimit = await checkRateLimit("send_connection");
      if (!rateLimit.allowed) {
        return JSON.stringify({
          success: false,
          rate_limited: true,
          error: rateLimit.reason,
          daily_used: rateLimit.dailyUsed,
          daily_max: rateLimit.dailyMax,
          hourly_used: rateLimit.hourlyUsed,
          hourly_max: rateLimit.hourlyMax,
        });
      }

      const actionId = await insertLinkedInAction({
        action_type: 'send_connection',
        target_url: normalizedUrl,
        target_name: prospect_name,
        payload: { note },
        campaign_id: campaign_id || null,
      });

      return JSON.stringify({
        success: true,
        action_id: actionId,
        status: "pending_approval",
        requires_approval: true,
        message: `✅ Demande de connexion à ${prospect_name} créée et en attente de votre approbation. Action #${actionId}. Note: "${note.substring(0, 50)}${note.length > 50 ? '...' : ''}". Allez dans l'onglet "Approbations" pour approuver.`,
        daily_remaining: rateLimit.remainingToday,
        daily_used: rateLimit.dailyUsed + 1,
        daily_max: rateLimit.dailyMax,
        hourly_used: rateLimit.hourlyUsed + 1,
        hourly_max: rateLimit.hourlyMax,
      });
    } catch (error) {
      return JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erreur" });
    }
  },
});

// Helper: normaliser l'URL LinkedIn (assurer https://www.linkedin.com/)
function normalizeLinkedInUrl(url: string): string {
  if (!url) return url;
  // Remplacer linkedin.com par www.linkedin.com si manquant
  return url.replace(/^https?:\/\/((?!www\.))linkedin\.com/i, "https://www.linkedin.com");
}

// TOOL: Envoyer un message LinkedIn direct
export const linkedinSendMessageTool = new DynamicStructuredTool({
  name: "linkedin_send_message",
  description: "Envoyer un message direct à une connexion LinkedIn existante. L'action est mise en queue pour l'extension Chrome. Limite: 50 messages/jour.",
  schema: z.object({
    linkedin_url: z.string().describe("URL du profil LinkedIn"),
    prospect_name: z.string().describe("Nom du prospect"),
    message: z.string().describe("Contenu du message"),
    campaign_id: z.number().optional().describe("ID de la campagne associée"),
    message_type: z.enum(["followup", "response", "custom"]).default("custom").describe("Type de message"),
  }),
  func: async ({ linkedin_url, prospect_name, message, campaign_id, message_type }) => {
    try {
      const normalizedUrl = normalizeLinkedInUrl(linkedin_url);

      // Anti-doublon: vérifier si une action identique existe déjà (pending_approval, approved, ou processing)
      const duplicateCheck = await pool.query(
        `SELECT id, status FROM linkedin_actions_queue
         WHERE action_type = 'send_message'
           AND target_url = $1
           AND status IN ('pending_approval', 'approved', 'processing')
           AND created_at >= NOW() - INTERVAL '1 hour'
         LIMIT 1`,
        [normalizedUrl]
      );
      if (duplicateCheck.rows.length > 0) {
        const existing = duplicateCheck.rows[0];
        return JSON.stringify({
          success: true,
          already_exists: true,
          action_id: existing.id,
          status: existing.status,
          message: `⚠️ Un message pour ${prospect_name} est déjà en file (Action #${existing.id}, statut: ${existing.status}). Pas de doublon créé.`,
        });
      }

      // Vérifier les limites LinkedIn (quotidienne + horaire + délai)
      const rateLimit = await checkRateLimit("send_message");
      if (!rateLimit.allowed) {
        return JSON.stringify({
          success: false,
          rate_limited: true,
          error: rateLimit.reason,
          daily_used: rateLimit.dailyUsed,
          daily_max: rateLimit.dailyMax,
          hourly_used: rateLimit.hourlyUsed,
          hourly_max: rateLimit.hourlyMax,
        });
      }

      // Enregistrer dans la queue avec statut pending_approval
      const actionId = await insertLinkedInAction({
        action_type: 'send_message',
        target_url: normalizedUrl,
        target_name: prospect_name,
        payload: { message, message_type },
        campaign_id: campaign_id || null,
      });

      // Aussi sauvegarder dans la table messages (non bloquant si prospect n'existe pas encore)
      try {
        await pool.query(
          `INSERT INTO messages (prospect_id, recipient_name, message_text, message_type, status, campaign_id, created_at)
           VALUES ((SELECT id FROM prospects WHERE linkedin_url = $1 LIMIT 1), $2, $3, $4, 'pending_approval', $5, NOW())`,
          [linkedin_url, prospect_name, message, message_type, campaign_id || null]
        );
      } catch (msgErr) {
        console.error("Non-fatal: failed to save message copy:", msgErr);
      }

      return JSON.stringify({
        success: true,
        action_id: actionId,
        status: "pending_approval",
        requires_approval: true,
        message: `✅ Message pour ${prospect_name} créé et en attente de votre approbation. Action #${actionId}. Message: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}". Allez dans l'onglet "Approbations" pour approuver.`,
        daily_remaining: rateLimit.remainingToday,
        daily_used: rateLimit.dailyUsed + 1,
        daily_max: rateLimit.dailyMax,
        hourly_used: rateLimit.hourlyUsed + 1,
        hourly_max: rateLimit.hourlyMax,
      });
    } catch (error) {
      return JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erreur" });
    }
  },
});

// =============================================
// CATÉGORIE 2: INTELLIGENCE & IA
// =============================================

// TOOL: Analyser un prospect
export const analyzeProspectTool = new DynamicStructuredTool({
  name: "analyze_prospect",
  description: "Analyser et scorer un prospect pour déterminer son potentiel. Évalue le rôle, l'entreprise, le secteur et donne une recommandation.",
  schema: z.object({
    name: z.string().describe("Nom du prospect"),
    role: z.string().describe("Poste actuel"),
    company: z.string().describe("Entreprise actuelle"),
    industry: z.string().optional().describe("Secteur d'activité"),
    company_size: z.string().optional().describe("Taille de l'entreprise"),
    linkedin_url: z.string().optional().describe("URL LinkedIn"),
  }),
  func: async ({ name, role, company, industry, company_size, linkedin_url }) => {
    try {
      let score = 50;
      const reasons: string[] = [];

      // Scoring par rôle décisionnaire
      const highRoles = ["ceo", "cto", "coo", "cfo", "vp", "founder", "co-founder", "directeur", "director", "head"];
      const midRoles = ["manager", "responsable", "lead", "chef"];
      const roleLower = role.toLowerCase();
      
      if (highRoles.some(r => roleLower.includes(r))) {
        score += 25;
        reasons.push("Poste décisionnaire de haut niveau (+25)");
      } else if (midRoles.some(r => roleLower.includes(r))) {
        score += 15;
        reasons.push("Poste de management intermédiaire (+15)");
      }

      // Scoring par taille d'entreprise
      if (company_size) {
        if (company_size.includes("11-50") || company_size.includes("51-200")) {
          score += 15;
          reasons.push("Taille d'entreprise idéale PME (+15)");
        } else if (company_size.includes("201-500")) {
          score += 10;
          reasons.push("ETI intéressante (+10)");
        }
      }

      // Scoring par secteur
      const hotIndustries = ["technology", "saas", "software", "ai", "fintech", "tech", "startup"];
      if (industry && hotIndustries.some(i => industry.toLowerCase().includes(i))) {
        score += 15;
        reasons.push("Secteur tech/innovation (+15)");
      }

      score = Math.min(100, Math.max(0, score));

      const quality = score >= 80 ? "excellent" : score >= 65 ? "bon" : score >= 50 ? "moyen" : "faible";
      const action = score >= 70
        ? "Contacter en priorité - Envoyer une demande de connexion personnalisée"
        : score >= 55
          ? "Bon potentiel - Ajouter à une campagne de prospection"
          : "Potentiel limité - Surveiller pour opportunité future";

      return JSON.stringify({
        success: true,
        prospect: { name, role, company, industry, company_size },
        score,
        quality,
        scoring_details: reasons,
        recommended_action: action,
      });
    } catch (error) {
      return JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erreur" });
    }
  },
});

// TOOL: Générer un message personnalisé
export const generateMessageTool = new DynamicStructuredTool({
  name: "generate_message",
  description: "Générer un message de prospection personnalisé pour un prospect. Retourne la structure et le contexte pour que l'IA rédige le message final.",
  schema: z.object({
    prospect_name: z.string().describe("Prénom ou nom du prospect"),
    prospect_role: z.string().describe("Poste du prospect"),
    prospect_company: z.string().describe("Entreprise du prospect"),
    message_type: z.enum(["connection", "followup", "response", "relance"]).describe("Type de message"),
    product_description: z.string().optional().describe("Description courte du produit/service à vendre"),
    context: z.string().optional().describe("Contexte additionnel (post récent, intérêt commun, etc.)"),
    tone: z.enum(["professional", "friendly", "casual"]).default("professional"),
  }),
  func: async ({ prospect_name, prospect_role, prospect_company, message_type, product_description, context, tone }) => {
    const guidelines: Record<string, { structure: string; maxLength: number; tips: string }> = {
      connection: {
        structure: "1. Salutation personnalisée\n2. Accroche liée à leur profil/activité\n3. Présentation ultra-courte de la valeur\n4. CTA douce (pas de vente directe)",
        maxLength: 300,
        tips: "Pas de pitch direct. Montrer de l'intérêt pour LEUR travail.",
      },
      followup: {
        structure: "1. Rappel contextuel (comment vous êtes connectés)\n2. Valeur concrète (chiffre, case study)\n3. CTA spécifique (call de 15min)",
        maxLength: 500,
        tips: "Apporter de la valeur avant de demander. Inclure un chiffre concret.",
      },
      response: {
        structure: "1. Remercier pour leur réponse\n2. Répondre directement\n3. Proposer la prochaine étape",
        maxLength: 500,
        tips: "Être direct et respectueux. Avancer vers un call.",
      },
      relance: {
        structure: "1. Rappel bref\n2. Nouvelle accroche/valeur\n3. CTA claire",
        maxLength: 300,
        tips: "Court et percutant. Pas de culpabilisation.",
      },
    };

    return JSON.stringify({
      success: true,
      prospect: { name: prospect_name, role: prospect_role, company: prospect_company },
      guidelines: guidelines[message_type],
      message_type,
      tone,
      product: product_description || "Non spécifié",
      context: context || "Aucun contexte additionnel",
      instruction: "Utilise ces guidelines pour rédiger un message personnalisé, naturel et engageant. Respecte la longueur max.",
    });
  },
});

// TOOL: Suggérer une stratégie d'approche
export const suggestStrategyTool = new DynamicStructuredTool({
  name: "suggest_strategy",
  description: "Proposer une stratégie d'approche personnalisée pour un prospect ou un segment de prospects.",
  schema: z.object({
    target_role: z.string().describe("Poste cible (ex: CEO de startup)"),
    target_industry: z.string().describe("Secteur cible"),
    product_service: z.string().describe("Produit/service à vendre"),
    budget_daily_connections: z.number().default(20).describe("Budget quotidien de connexions"),
  }),
  func: async ({ target_role, target_industry, product_service, budget_daily_connections }) => {
    return JSON.stringify({
      success: true,
      strategy: {
        target: { role: target_role, industry: target_industry },
        product: product_service,
        sequence: [
          { day: 0, action: "send_connection", description: "Demande de connexion avec note personnalisée" },
          { day: 1, action: "visit_profile", description: "Visiter le profil (déclenche une notification LinkedIn)" },
          { day: 3, action: "send_message", description: "1er message: valeur + accroche" },
          { day: 7, action: "send_message", description: "2e message: case study ou témoignage" },
          { day: 14, action: "send_message", description: "3e message: dernière relance + CTA directe" },
        ],
        daily_budget: budget_daily_connections,
        estimated_results: {
          acceptance_rate: "25-35%",
          response_rate: "10-20%",
          meeting_rate: "3-5%",
        },
        tips: [
          "Personnaliser chaque message avec des infos du profil",
          "Interagir avec leurs posts avant de les contacter",
          "Envoyer les connexions entre 8h-10h ou 17h-19h",
          "Ne pas dépasser 80 connexions/jour pour éviter les restrictions",
        ],
      },
    });
  },
});

// =============================================
// CATÉGORIE 3: BASE DE DONNÉES
// =============================================

// TOOL: Rechercher des prospects dans la BDD locale
export const searchProspectsDbTool = new DynamicStructuredTool({
  name: "search_prospects_db",
  description: "Rechercher des prospects déjà enregistrés dans la base de données locale.",
  schema: z.object({
    industry: z.string().optional().describe("Secteur d'activité"),
    company_size: z.string().optional().describe("Taille de l'entreprise"),
    location: z.string().optional().describe("Localisation"),
    role: z.string().optional().describe("Poste"),
    status: z.string().optional().describe("Statut (identified, connected, contacted, responded, interested, converted)"),
    min_score: z.number().optional().describe("Score minimum"),
    limit: z.number().default(10).describe("Nombre max de résultats"),
  }),
  func: async ({ industry, company_size, location, role, status, min_score, limit }) => {
    try {
      let sql = "SELECT * FROM prospects WHERE 1=1";
      const params: any[] = [];
      let idx = 1;

      if (industry) { sql += ` AND industry ILIKE $${idx}`; params.push(`%${industry}%`); idx++; }
      if (company_size) { sql += ` AND company_size = $${idx}`; params.push(company_size); idx++; }
      if (location) { sql += ` AND location ILIKE $${idx}`; params.push(`%${location}%`); idx++; }
      if (role) { sql += ` AND role ILIKE $${idx}`; params.push(`%${role}%`); idx++; }
      if (status) { sql += ` AND status = $${idx}`; params.push(status); idx++; }
      if (min_score) { sql += ` AND score >= $${idx}`; params.push(min_score); idx++; }

      sql += ` ORDER BY score DESC LIMIT $${idx}`;
      params.push(limit);

      const result = await pool.query(sql, params);
      return JSON.stringify({ success: true, count: result.rows.length, prospects: result.rows });
    } catch (error) {
      return JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erreur" });
    }
  },
});

// TOOL: Sauvegarder un prospect
export const saveProspectTool = new DynamicStructuredTool({
  name: "save_prospect",
  description: "Sauvegarder un nouveau prospect dans la base de données ou mettre à jour un existant.",
  schema: z.object({
    name: z.string().describe("Nom complet"),
    role: z.string().describe("Poste"),
    company: z.string().describe("Entreprise"),
    linkedin_url: z.string().describe("URL LinkedIn"),
    industry: z.string().optional().describe("Secteur"),
    location: z.string().optional().describe("Localisation"),
    company_size: z.string().optional().describe("Taille entreprise"),
    email: z.string().optional().describe("Email"),
    score: z.number().optional().describe("Score de qualification"),
    notes: z.string().optional().describe("Notes"),
  }),
  func: async ({ name, role, company, linkedin_url, industry, location, company_size, email, score, notes }) => {
    try {
      const result = await pool.query(
        `INSERT INTO prospects (name, role, company, linkedin_url, industry, location, company_size, email, score, notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
         ON CONFLICT (linkedin_url) DO UPDATE SET
           name = EXCLUDED.name, role = EXCLUDED.role, company = EXCLUDED.company,
           industry = COALESCE(EXCLUDED.industry, prospects.industry),
           location = COALESCE(EXCLUDED.location, prospects.location),
           company_size = COALESCE(EXCLUDED.company_size, prospects.company_size),
           email = COALESCE(EXCLUDED.email, prospects.email),
           score = COALESCE(EXCLUDED.score, prospects.score),
           notes = COALESCE(EXCLUDED.notes, prospects.notes),
           updated_at = NOW()
         RETURNING id, name, score, status`,
        [name, role, company, linkedin_url, industry || null, location || null, company_size || null, email || null, score || 0, notes || null]
      );

      return JSON.stringify({
        success: true,
        prospect: result.rows[0],
        message: `Prospect ${name} sauvegardé avec succès (score: ${result.rows[0].score}).`,
      });
    } catch (error) {
      return JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erreur" });
    }
  },
});

// TOOL: Récupérer les stats d'une campagne
export const getCampaignStatsTool = new DynamicStructuredTool({
  name: "get_campaign_stats",
  description: "Récupérer les statistiques détaillées d'une campagne de prospection.",
  schema: z.object({
    campaign_id: z.number().optional().describe("ID de la campagne. Si non fourni, retourne les stats globales."),
  }),
  func: async ({ campaign_id }) => {
    try {
      if (campaign_id) {
        const campaign = await pool.query(`SELECT * FROM campaigns WHERE id = $1`, [campaign_id]);
        if (campaign.rows.length === 0) {
          return JSON.stringify({ success: false, error: "Campagne non trouvée" });
        }

        const messages = await pool.query(
          `SELECT status, COUNT(*) as count FROM messages WHERE campaign_id = $1 GROUP BY status`,
          [campaign_id]
        );

        const actions = await pool.query(
          `SELECT action_type, status, COUNT(*) as count FROM linkedin_actions_queue WHERE campaign_id = $1 GROUP BY action_type, status`,
          [campaign_id]
        );

        return JSON.stringify({
          success: true,
          campaign: campaign.rows[0],
          message_stats: messages.rows,
          action_stats: actions.rows,
        });
      }

      // Stats globales
      const totals = await pool.query(
        `SELECT 
          (SELECT COUNT(*) FROM campaigns) as total_campaigns,
          (SELECT COUNT(*) FROM campaigns WHERE status = 'active') as active_campaigns,
          (SELECT COUNT(*) FROM prospects) as total_prospects,
          (SELECT COUNT(*) FROM messages) as total_messages,
          (SELECT COUNT(*) FROM messages WHERE status = 'replied') as total_replies,
          (SELECT COUNT(*) FROM linkedin_actions_queue WHERE status = 'pending') as pending_actions`
      );

      return JSON.stringify({ success: true, stats: totals.rows[0] });
    } catch (error) {
      return JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erreur" });
    }
  },
});

// TOOL: Planifier un follow-up
export const scheduleFollowupTool = new DynamicStructuredTool({
  name: "schedule_followup",
  description: "Planifier un message de relance automatique pour un prospect à une date donnée.",
  schema: z.object({
    prospect_id: z.number().describe("ID du prospect"),
    message_text: z.string().describe("Contenu du message de relance"),
    delay_days: z.number().default(3).describe("Nombre de jours avant envoi (ex: 3 pour J+3)"),
    campaign_id: z.number().optional().describe("ID de la campagne associée"),
  }),
  func: async ({ prospect_id, message_text, delay_days, campaign_id }) => {
    try {
      // Vérifier les limites pour les follow-ups
      const rateLimit = await checkRateLimit("schedule_followup");
      if (!rateLimit.allowed) {
        return JSON.stringify({
          success: false,
          rate_limited: true,
          error: rateLimit.reason,
          daily_used: rateLimit.dailyUsed,
          daily_max: rateLimit.dailyMax,
        });
      }

      const result = await pool.query(
        `INSERT INTO scheduled_followups (prospect_id, campaign_id, message_text, scheduled_for, status, created_at)
         VALUES ($1, $2, $3, NOW() + INTERVAL '${delay_days} days', 'scheduled', NOW())
         RETURNING id, scheduled_for`,
        [prospect_id, campaign_id || null, message_text]
      );

      return JSON.stringify({
        success: true,
        followup_id: result.rows[0].id,
        scheduled_for: result.rows[0].scheduled_for,
        message: `Relance planifiée pour J+${delay_days} (${new Date(result.rows[0].scheduled_for).toLocaleDateString('fr-FR')}).`,
      });
    } catch (error) {
      return JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erreur" });
    }
  },
});

// =============================================
// CATÉGORIE 4: CAMPAGNES
// =============================================

// TOOL: Créer une campagne
export const createCampaignTool = new DynamicStructuredTool({
  name: "create_campaign",
  description: "Créer une nouvelle campagne de prospection LinkedIn. Utiliser campaign_type='connections_only' pour les campagnes d'envoi de connexions sans message.",
  schema: z.object({
    name: z.string().describe("Nom de la campagne"),
    description: z.string().describe("Description de la campagne"),
    industry: z.string().describe("Secteur ciblé"),
    company_size: z.string().describe("Taille des entreprises ciblées"),
    location: z.string().describe("Localisation cible"),
    target_role: z.string().describe("Poste cible"),
    campaign_type: z.enum(["messages", "connections_only"]).default("messages").describe("Type de campagne: 'messages' pour envoi de messages, 'connections_only' pour envoi de connexions uniquement sans message"),
    template_invitation: z.string().describe("Template de demande de connexion"),
    template_followup: z.string().describe("Template de message de suivi"),
  }),
  func: async ({ name, description, industry, company_size, location, target_role, campaign_type, template_invitation, template_followup }) => {
    try {
      const result = await pool.query(
        `INSERT INTO campaigns (name, description, industry, company_size, location, target_role, campaign_type, template_invitation, template_followup, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft', NOW()) RETURNING id`,
        [name, description, industry, company_size, location, target_role, campaign_type || 'messages', template_invitation, template_followup]
      );

      const typeLabel = campaign_type === 'connections_only' ? "d'envoi de connexions" : "de prospection";
      return JSON.stringify({
        success: true,
        campaign_id: result.rows[0].id,
        campaign_type: campaign_type || 'messages',
        status: "draft",
        message: `Campagne ${typeLabel} "${name}" créée avec succès. Utilisez update_campaign pour l'activer.`,
      });
    } catch (error) {
      return JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erreur" });
    }
  },
});

// TOOL: Mettre à jour une campagne
export const updateCampaignTool = new DynamicStructuredTool({
  name: "update_campaign",
  description: "Mettre à jour le statut ou les stats d'une campagne existante.",
  schema: z.object({
    campaign_id: z.number().describe("ID de la campagne"),
    status: z.enum(["draft", "active", "paused", "completed"]).optional(),
    contacted: z.number().optional(),
    replied: z.number().optional(),
    converted: z.number().optional(),
  }),
  func: async ({ campaign_id, status, contacted, replied, converted }) => {
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (status) { updates.push(`status = $${idx}`); values.push(status); idx++; }
      if (contacted !== undefined) { updates.push(`contacted = $${idx}`); values.push(contacted); idx++; }
      if (replied !== undefined) { updates.push(`replied = $${idx}`); values.push(replied); idx++; }
      if (converted !== undefined) { updates.push(`converted = $${idx}`); values.push(converted); idx++; }

      if (updates.length === 0) {
        return JSON.stringify({ success: false, error: "Aucune mise à jour spécifiée" });
      }

      updates.push(`updated_at = NOW()`);
      values.push(campaign_id);

      await pool.query(`UPDATE campaigns SET ${updates.join(", ")} WHERE id = $${idx}`, values);
      return JSON.stringify({ success: true, campaign_id, updated_fields: updates.length - 1 });
    } catch (error) {
      return JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erreur" });
    }
  },
});

// TOOL: Lancer l'exécution d'une campagne (crée une action en attente d'approbation)
export const executeCampaignTool = new DynamicStructuredTool({
  name: "execute_campaign",
  description: "Lancer l'exécution d'une campagne. Crée une action 'search_and_connection' (pour campaign_type='connections_only') ou 'search_and_message' (pour 'messages') en attente d'approbation. La campagne sera automatiquement activée quand l'utilisateur approuvera l'action dans l'onglet Approbations. L'extension Chrome exécutera ensuite la recherche et l'envoi en respectant les limites LinkedIn.",
  schema: z.object({
    campaign_id: z.number().describe("ID de la campagne à lancer"),
  }),
  func: async ({ campaign_id }) => {
    try {
      // Récupérer la campagne
      const campRes = await pool.query(`SELECT * FROM campaigns WHERE id = $1`, [campaign_id]);
      if (campRes.rows.length === 0) {
        return JSON.stringify({ success: false, error: "Campagne non trouvée" });
      }
      const campaign = campRes.rows[0];

      if (!["draft", "active"].includes(campaign.status)) {
        return JSON.stringify({ success: false, error: `Campagne en statut '${campaign.status}', ne peut pas être lancée` });
      }

      // Construire l'URL de recherche
      const searchKeywords: string[] = [];
      if (campaign.target_role) {
        searchKeywords.push(...campaign.target_role.split(",").map((r: string) => r.trim()));
      }
      if (campaign.industry) {
        searchKeywords.push(campaign.industry);
      }
      if (searchKeywords.length === 0) {
        return JSON.stringify({ success: false, error: "Aucun critère de ciblage (rôle/industrie)" });
      }

      const keywordsParam = encodeURIComponent(searchKeywords.join(" "));
      let searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${keywordsParam}&origin=SWITCH_SEARCH_VERTICAL`;
      if (campaign.location) {
        const locKw = encodeURIComponent(campaign.location.split(",")[0].trim());
        searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${keywordsParam}+${locKw}&origin=SWITCH_SEARCH_VERTICAL`;
      }

      const campaignType = campaign.campaign_type || "messages";
      const actionType = campaignType === "connections_only" ? "search_and_connection" : "search_and_message";

      let messageTemplate: string | null = null;
      if (campaignType === "messages") {
        const tpl: string = campaign.template_invitation ||
          `Bonjour {name},\n\nJ'ai remarqué votre profil et j'aimerais échanger avec vous.\n\nCordialement`;
        messageTemplate = tpl
          .replace(/\{\{name\}\}/g, "{name}")
          .replace(/\{firstName\}/g, "{name}")
          .replace(/\{prénom\}/g, "{name}");
      }

      // Vérifier qu'aucune action n'est déjà en cours pour cette campagne
      const existing = await pool.query(
        `SELECT id, status FROM linkedin_actions_queue 
         WHERE campaign_id = $1 AND status IN ('pending_approval', 'approved', 'processing')
         LIMIT 1`,
        [campaign_id]
      );
      if (existing.rows.length > 0) {
        return JSON.stringify({
          success: false,
          error: `Une action est déjà en cours/en attente pour cette campagne (id=${existing.rows[0].id}, statut=${existing.rows[0].status})`,
        });
      }

      const dailyLimit = campaign.daily_limit || 20;
      const actionId = await insertLinkedInAction({
        action_type: actionType,
        target_url: searchUrl,
        target_name: `Campagne: ${campaign.name}`,
        payload: {
          message_template: messageTemplate,
          campaign_type: campaignType,
          campaign_id,
          campaign_name: campaign.name,
          target_role: campaign.target_role,
          industry: campaign.industry,
          location: campaign.location,
          company_size: campaign.company_size,
          daily_limit: dailyLimit,
          follow_up_days: campaign.follow_up_days || 3,
        },
        campaign_id,
      });

      const typeLabel = campaignType === "connections_only" ? "envoi de connexions" : "envoi de messages";
      return JSON.stringify({
        success: true,
        action_id: actionId,
        action_type: actionType,
        campaign_type: campaignType,
        message: `Action d'${typeLabel} créée (id=${actionId}) en attente d'approbation. La campagne sera automatiquement activée et la recherche démarrera dès que vous approuverez l'action dans l'onglet Approbations. Limite: ${dailyLimit} connexions/jour, respect des cadences LinkedIn.`,
      });
    } catch (error) {
      return JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erreur" });
    }
  },
});

// TOOL: Consulter le statut des limites LinkedIn
export const getRateLimitsTool = new DynamicStructuredTool({
  name: "get_rate_limits",
  description: "Consulter le statut actuel des limites LinkedIn (quotidiennes et horaires) pour toutes les actions. Utiliser avant de planifier des actions en masse pour savoir combien il reste de quota.",
  schema: z.object({}),
  func: async () => {
    try {
      const status = await getRateLimitStatus();
      return JSON.stringify({
        success: true,
        summary: formatRateLimitStatus(status),
        details: status,
      });
    } catch (error) {
      return JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erreur" });
    }
  },
});

// =============================================
// HELPER: Construire l'URL de recherche LinkedIn
// =============================================
function buildLinkedInSearchUrl(params: {
  keywords?: string;
  role?: string;
  location?: string;
  industry?: string;
  company_size?: string;
  network?: string;
}): string {
  const base = "https://www.linkedin.com/search/results/people/";
  const searchParams = new URLSearchParams();
  
  // Combiner keywords + role dans les mots-clés (plus flexible que le filtre title= qui est trop restrictif)
  const keywordParts: string[] = [];
  if (params.keywords) keywordParts.push(params.keywords);
  if (params.role && params.role !== params.keywords) keywordParts.push(params.role);
  if (keywordParts.length > 0) searchParams.set("keywords", keywordParts.join(" "));
  
  // Note: geoUrn nécessite un ID LinkedIn numérique, pas un nom de ville
  // On l'ajoute dans les keywords si c'est un texte libre
  if (params.location) {
    // Si c'est un texte (pas un URN), l'ajouter aux keywords
    if (/^\d+$/.test(params.location)) {
      searchParams.set("geoUrn", params.location);
    } else {
      // Ajouter la localisation dans les keywords pour filtrage souple
      const currentKw = searchParams.get("keywords") || "";
      searchParams.set("keywords", `${currentKw} ${params.location}`.trim());
    }
  }
  
  // Filtre réseau: F=1er degré, S=2e degré, O=3e degré+
  if (params.network) searchParams.set("network", JSON.stringify([params.network]));
  
  return `${base}?${searchParams.toString()}`;
}

// TOOL: Lancer la vérification des connexions LinkedIn via l'extension Chrome
// Crée les actions check_connection et retourne les IDs — appeler get_connection_results ensuite
export const checkNetworkConnectionsTool = new DynamicStructuredTool({
  name: "check_network_connections",
  description: "Lance la vérification des connexions LinkedIn pour une liste de prospects via l'extension Chrome. Crée les tâches de vérification et retourne un check_id. Appeler ensuite get_connection_results avec ce check_id pour obtenir les résultats (attendre ~15-20 secondes par prospect).",
  schema: z.object({
    prospect_names: z.array(z.string()).describe("Liste des noms de prospects à vérifier"),
    prospect_urls: z.array(z.string()).describe("Liste des URLs LinkedIn (même ordre que prospect_names)"),
  }),
  func: async ({ prospect_names, prospect_urls }) => {
    try {
      if (!prospect_urls || prospect_urls.length !== prospect_names.length) {
        return JSON.stringify({ success: false, error: "prospect_urls doit avoir le même nombre d'éléments que prospect_names." });
      }

      const normalizeUrl = (url: string) =>
        url.replace(/^https?:\/\/((?!www\.))(linkedin\.com)/i, "https://www.$2");

      const actionIds: number[] = [];
      for (let i = 0; i < prospect_names.length; i++) {
        const r = await insertLinkedInAction({
          action_type: 'check_connection',
          target_url: normalizeUrl(prospect_urls[i]),
          target_name: prospect_names[i],
          payload: { check_only: true },
          status: 'approved',
        });
        actionIds.push(r);
      }

      const estimatedSeconds = prospect_names.length * 20;
      return JSON.stringify({
        success: true,
        check_id: actionIds.join(","),
        action_ids: actionIds,
        total: prospect_names.length,
        message: `✅ Vérification lancée pour ${prospect_names.length} prospect(s). L'extension Chrome visite leurs profils. Attends ~${estimatedSeconds} secondes puis appelle get_connection_results avec check_id="${actionIds.join(",")}" pour voir les résultats.`,
      });
    } catch (error) {
      return JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erreur" });
    }
  },
});

// TOOL: Récupérer les résultats de vérification des connexions LinkedIn
export const getConnectionResultsTool = new DynamicStructuredTool({
  name: "get_connection_results",
  description: "Récupère les résultats de la vérification des connexions LinkedIn lancée par check_network_connections. Appeler avec le check_id retourné. Si les résultats ne sont pas encore prêts, attendre quelques secondes et réessayer.",
  schema: z.object({
    check_id: z.string().describe("L'identifiant retourné par check_network_connections (IDs séparés par virgule)"),
  }),
  func: async ({ check_id }) => {
    try {
      const actionIds = check_id.split(",").map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id));
      if (actionIds.length === 0) {
        return JSON.stringify({ success: false, error: "check_id invalide." });
      }

      const rows = await pool.query(
        `SELECT id, target_name, target_url, result, status FROM linkedin_actions_queue WHERE id = ANY($1)`,
        [actionIds]
      );

      const pending = rows.rows.filter((r: { status: string }) => r.status === "approved" || r.status === "processing");
      if (pending.length > 0) {
        return JSON.stringify({
          success: true,
          ready: false,
          pending_count: pending.length,
          total: actionIds.length,
          message: `⏳ ${pending.length}/${actionIds.length} vérification(s) encore en cours. Réessaie dans 15 secondes.`,
        });
      }

      const inNetwork: Array<{ name: string; url: string }> = [];
      const notInNetwork: Array<{ name: string; url: string; reason: string }> = [];

      for (const row of rows.rows) {
        const res = typeof row.result === "string" ? JSON.parse(row.result || "{}") : (row.result || {});
        const degree = res.degree ?? 0;
        const connected = res.connected ?? (degree === 1);

        if (connected || degree === 1) {
          inNetwork.push({ name: row.target_name, url: row.target_url });
        } else if (row.status === "failed") {
          notInNetwork.push({ name: row.target_name, url: row.target_url, reason: "Vérification échouée — profil inaccessible" });
        } else {
          notInNetwork.push({
            name: row.target_name,
            url: row.target_url,
            reason: degree === 0 ? "Degré non déterminé" : `${degree}e degré — pas encore connecté`,
          });
        }
      }

      return JSON.stringify({
        success: true,
        ready: true,
        in_network: inNetwork,
        in_network_count: inNetwork.length,
        not_in_network: notInNetwork,
        not_in_network_count: notInNetwork.length,
        summary: `✅ ${inNetwork.length} prospect(s) dans votre réseau (message possible) : ${inNetwork.map(p => p.name).join(", ") || "aucun"}.\n❌ ${notInNetwork.length} prospect(s) hors réseau (message impossible) : ${notInNetwork.map(p => `${p.name} (${p.reason})`).join(", ") || "aucun"}.`,
        can_message: inNetwork,
        cannot_message: notInNetwork,
      });
    } catch (error) {
      return JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erreur" });
    }
  },
});

// =============================================
// CATÉGORIE 5: WORKFLOW AUTONOME
// =============================================

// TOOL: Récupérer les résultats d'une recherche LinkedIn terminée
export const getSearchResultsTool = new DynamicStructuredTool({
  name: "get_search_results",
  description: "Récupérer les résultats d'une recherche LinkedIn terminée. Retourne les prospects trouvés et sauvegardés en DB. Utiliser après qu'une action de recherche a été exécutée par l'extension.",
  schema: z.object({
    search_action_id: z.number().optional().describe("ID de l'action de recherche. Si non fourni, retourne les résultats de la dernière recherche."),
  }),
  func: async ({ search_action_id }) => {
    try {
      let actionResult;
      if (search_action_id) {
        actionResult = await pool.query(
          `SELECT id, status, result, created_at FROM linkedin_actions_queue WHERE id = $1 AND action_type = 'search'`,
          [search_action_id]
        );
      } else {
        actionResult = await pool.query(
          `SELECT id, status, result, created_at FROM linkedin_actions_queue WHERE action_type = 'search' ORDER BY created_at DESC LIMIT 1`
        );
      }

      if (actionResult.rows.length === 0) {
        return JSON.stringify({ success: false, error: "Aucune recherche trouvée." });
      }

      const action = actionResult.rows[0];
      if (action.status !== "completed") {
        return JSON.stringify({
          success: false,
          status: action.status,
          message: `La recherche #${action.id} n'est pas encore terminée (statut: ${action.status}). Attendez que l'utilisateur approuve et que l'extension exécute la recherche.`,
        });
      }

      const result = typeof action.result === "string" ? JSON.parse(action.result) : action.result;
      const profiles = result?.profiles || [];
      const savedCount = result?.saved_to_db || 0;

      // Aussi récupérer les prospects récents de la DB qui correspondent
      const recentProspects = await pool.query(
        `SELECT id, name, role, company, location, linkedin_url, score, status
         FROM prospects
         WHERE notes LIKE $1
         ORDER BY created_at DESC LIMIT 50`,
        [`%action #${action.id}%`]
      );

      return JSON.stringify({
        success: true,
        search_action_id: action.id,
        profiles_found: profiles.length,
        saved_to_db: savedCount,
        prospects: recentProspects.rows.length > 0 ? recentProspects.rows : profiles,
        message: `Recherche #${action.id} terminée: ${profiles.length} profils trouvés, ${savedCount} sauvegardés comme prospects.`,
      });
    } catch (error) {
      return JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erreur" });
    }
  },
});

// TOOL: Envoyer des messages en masse à des prospects (crée les actions en pending_approval)
export const bulkSendMessagesTool = new DynamicStructuredTool({
  name: "bulk_send_messages",
  description: "Envoyer un message personnalisé à plusieurs prospects en une seule commande. Crée une action send_message par prospect, toutes en pending_approval. Le message_template peut contenir {name}, {role}, {company} qui seront remplacés par les données du prospect.",
  schema: z.object({
    prospect_filter: z.object({
      role: z.string().optional().describe("Filtrer par poste (ex: 'ingénieur IA')"),
      location: z.string().optional().describe("Filtrer par localisation"),
      status: z.string().optional().describe("Filtrer par statut (default: 'identified')"),
      limit: z.number().default(10).describe("Nombre max de prospects à contacter"),
    }).describe("Critères pour sélectionner les prospects de la DB"),
    message_template: z.string().describe("Template du message. Variables: {name}, {role}, {company}. Ex: 'Bonjour {name}, j'ai vu que vous êtes {role} chez {company}...'"),
    campaign_id: z.number().optional().describe("ID de la campagne associée"),
  }),
  func: async ({ prospect_filter, message_template, campaign_id }) => {
    try {
      // Vérifier les limites avant de créer en masse
      const rateLimit = await checkRateLimit("send_message");
      if (!rateLimit.allowed) {
        return JSON.stringify({
          success: false,
          rate_limited: true,
          error: rateLimit.reason,
        });
      }

      // Chercher les prospects correspondant aux filtres
      let sql = `SELECT id, name, role, company, location, linkedin_url FROM prospects WHERE linkedin_url IS NOT NULL`;
      const params: any[] = [];
      let idx = 1;

      if (prospect_filter.status) {
        sql += ` AND status = $${idx}`;
        params.push(prospect_filter.status);
        idx++;
      } else {
        sql += ` AND status = 'identified'`;
      }

      if (prospect_filter.role) {
        sql += ` AND role ILIKE $${idx}`;
        params.push(`%${prospect_filter.role}%`);
        idx++;
      }

      if (prospect_filter.location) {
        sql += ` AND location ILIKE $${idx}`;
        params.push(`%${prospect_filter.location}%`);
        idx++;
      }

      sql += ` ORDER BY score DESC, created_at DESC LIMIT $${idx}`;
      params.push(prospect_filter.limit);

      const prospectResult = await pool.query(sql, params);

      if (prospectResult.rows.length === 0) {
        return JSON.stringify({
          success: false,
          error: "Aucun prospect trouvé avec ces critères. Lancez d'abord une recherche LinkedIn avec linkedin_search.",
        });
      }

      // Vérifier combien on peut encore envoyer aujourd'hui
      const maxToSend = Math.min(prospectResult.rows.length, rateLimit.remainingToday + 1);
      const prospectsToMessage = prospectResult.rows.slice(0, maxToSend);

      const createdActions: any[] = [];
      const skipped: string[] = [];

      for (const prospect of prospectsToMessage) {
        // Personnaliser le message
        const personalizedMessage = message_template
          .replace(/\{name\}/g, prospect.name?.split(" ")[0] || "")
          .replace(/\{role\}/g, prospect.role || "professionnel")
          .replace(/\{company\}/g, prospect.company || "votre entreprise");

        // Vérifier anti-doublon
        const dupCheck = await pool.query(
          `SELECT id FROM linkedin_actions_queue
           WHERE action_type = 'send_message' AND target_url = $1
             AND status IN ('pending_approval', 'approved', 'processing')
             AND created_at >= NOW() - INTERVAL '24 hours'
           LIMIT 1`,
          [prospect.linkedin_url]
        );

        if (dupCheck.rows.length > 0) {
          skipped.push(prospect.name);
          continue;
        }

        // Créer l'action send_message
        const actionResult = await pool.query(
          `INSERT INTO linkedin_actions_queue (action_type, target_url, target_name, payload, status, campaign_id, prospect_id, created_at)
           VALUES ('send_message', $1, $2, $3, 'pending_approval', $4, $5, NOW()) RETURNING id`,
          [
            prospect.linkedin_url,
            prospect.name,
            JSON.stringify({ message: personalizedMessage, message_type: "custom" }),
            campaign_id || null,
            prospect.id,
          ]
        );

        createdActions.push({
          action_id: actionResult.rows[0].id,
          prospect_name: prospect.name,
          message_preview: personalizedMessage.substring(0, 60) + "...",
        });

        // Mettre à jour le statut du prospect
        await pool.query(
          `UPDATE prospects SET status = 'contacted', updated_at = NOW() WHERE id = $1`,
          [prospect.id]
        );
      }

      return JSON.stringify({
        success: true,
        total_prospects_found: prospectResult.rows.length,
        messages_created: createdActions.length,
        skipped_duplicates: skipped.length,
        actions: createdActions,
        message: `✅ ${createdActions.length} message(s) créé(s) en attente d'approbation pour ${createdActions.length} prospect(s). ${skipped.length > 0 ? `${skipped.length} doublon(s) ignoré(s).` : ""} Allez dans l'onglet "Approbations" pour les approuver.`,
      });
    } catch (error) {
      return JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erreur" });
    }
  },
});

// =============================================
// EXPORT: Tous les tools
// =============================================
export const ALL_TOOLS = [
  // LinkedIn Actions
  linkedinSearchTool,
  linkedinVisitProfileTool,
  linkedinSendConnectionTool,
  linkedinSendMessageTool,
  // Workflow Autonome
  getSearchResultsTool,
  bulkSendMessagesTool,
  // Intelligence & IA
  analyzeProspectTool,
  generateMessageTool,
  suggestStrategyTool,
  // Base de données
  searchProspectsDbTool,
  saveProspectTool,
  getCampaignStatsTool,
  scheduleFollowupTool,
  // Compliance LinkedIn
  getRateLimitsTool,
  // Campagnes
  createCampaignTool,
  updateCampaignTool,
  executeCampaignTool,
];

export const TOOLS_MAP: Record<string, DynamicStructuredTool> = {};
ALL_TOOLS.forEach(tool => { TOOLS_MAP[tool.name] = tool; });
