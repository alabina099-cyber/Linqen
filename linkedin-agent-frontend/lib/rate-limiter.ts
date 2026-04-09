import { pool } from "./db";
import { LINKEDIN_LIMITS } from "./agent-config";

// =============================================
// LinkedIn Rate Limiter
// Vérifie les limites quotidiennes ET horaires avant chaque action
// =============================================

export type ActionType = "send_connection" | "send_message" | "visit_profile" | "search" | "schedule_followup";

interface RateLimitConfig {
  maxPerDay: number;
  maxPerHour: number;
  delayBetweenMs: number;
  label: string;
}

const RATE_LIMITS: Record<ActionType, RateLimitConfig> = {
  send_connection: {
    maxPerDay: LINKEDIN_LIMITS.maxConnectionsPerDay,
    maxPerHour: LINKEDIN_LIMITS.maxConnectionsPerHour,
    delayBetweenMs: LINKEDIN_LIMITS.delayBetweenConnections,
    label: "demandes de connexion",
  },
  send_message: {
    maxPerDay: LINKEDIN_LIMITS.maxMessagesPerDay,
    maxPerHour: LINKEDIN_LIMITS.maxMessagesPerHour,
    delayBetweenMs: LINKEDIN_LIMITS.delayBetweenMessages,
    label: "messages",
  },
  visit_profile: {
    maxPerDay: LINKEDIN_LIMITS.maxProfileVisitsPerDay,
    maxPerHour: LINKEDIN_LIMITS.maxProfileVisitsPerHour,
    delayBetweenMs: LINKEDIN_LIMITS.delayBetweenProfileVisits,
    label: "visites de profil",
  },
  search: {
    maxPerDay: LINKEDIN_LIMITS.maxSearchesPerDay,
    maxPerHour: Math.ceil(LINKEDIN_LIMITS.maxSearchesPerDay / 8),
    delayBetweenMs: LINKEDIN_LIMITS.delayBetweenSearches,
    label: "recherches",
  },
  schedule_followup: {
    maxPerDay: LINKEDIN_LIMITS.maxFollowupsPerDay,
    maxPerHour: Math.ceil(LINKEDIN_LIMITS.maxFollowupsPerDay / 8),
    delayBetweenMs: LINKEDIN_LIMITS.delayBetweenActions,
    label: "follow-ups planifiés",
  },
};

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  dailyUsed: number;
  dailyMax: number;
  hourlyUsed: number;
  hourlyMax: number;
  nextAllowedAt?: string;
  remainingToday: number;
}

// Vérifier si une action est autorisée selon les limites LinkedIn
export async function checkRateLimit(actionType: ActionType): Promise<RateLimitResult> {
  const config = RATE_LIMITS[actionType];

  try {
    // Compter uniquement les actions TERMINÉES (completed) avec executed_at aujourd'hui
    // executed_at = moment réel d'exécution (pas created_at qui est la date de mise en queue)
    const dailyResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM linkedin_actions_queue
       WHERE action_type = $1
         AND status = 'completed'
         AND executed_at IS NOT NULL
         AND executed_at >= CURRENT_DATE`,
      [actionType]
    );
    const dailyUsed = parseInt(dailyResult.rows[0].count);

    // Compter les actions terminées de la dernière heure (basé sur executed_at)
    const hourlyResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM linkedin_actions_queue
       WHERE action_type = $1
         AND status = 'completed'
         AND executed_at IS NOT NULL
         AND executed_at >= NOW() - INTERVAL '1 hour'`,
      [actionType]
    );
    const hourlyUsed = parseInt(hourlyResult.rows[0].count);

    // DEBUG: Log les valeurs du rate limiter
    console.log(`[RATE LIMITER] ${actionType}: daily=${dailyUsed}/${config.maxPerDay}, hourly=${hourlyUsed}/${config.maxPerHour}`);

    // Vérifier la limite quotidienne
    if (dailyUsed >= config.maxPerDay) {
      return {
        allowed: false,
        reason: `🚫 Limite quotidienne atteinte pour les ${config.label} (${dailyUsed}/${config.maxPerDay}). Réessayez demain après minuit.`,
        dailyUsed,
        dailyMax: config.maxPerDay,
        hourlyUsed,
        hourlyMax: config.maxPerHour,
        remainingToday: 0,
      };
    }

    // Vérifier la limite horaire
    if (hourlyUsed >= config.maxPerHour) {
      const oldestInWindow = await pool.query(
        `SELECT executed_at FROM linkedin_actions_queue
         WHERE action_type = $1
           AND status = 'completed'
           AND executed_at IS NOT NULL
           AND executed_at >= NOW() - INTERVAL '1 hour'
         ORDER BY executed_at ASC LIMIT 1`,
        [actionType]
      );
      const nextAllowed = oldestInWindow.rows.length > 0
        ? new Date(new Date(oldestInWindow.rows[0].executed_at).getTime() + 3600000).toLocaleTimeString("fr-FR")
        : "dans ~1 heure";

      return {
        allowed: false,
        reason: `⏳ Limite horaire atteinte pour les ${config.label} (${hourlyUsed}/${config.maxPerHour} cette heure). Prochain créneau disponible vers ${nextAllowed}.`,
        dailyUsed,
        dailyMax: config.maxPerDay,
        hourlyUsed,
        hourlyMax: config.maxPerHour,
        nextAllowedAt: nextAllowed,
        remainingToday: config.maxPerDay - dailyUsed,
      };
    }

    // Vérifier le délai minimum depuis la dernière action terminée du même type
    // IMPORTANT: Comparaison entièrement en SQL pour éviter le décalage timezone JS/DB
    const delaySeconds = Math.ceil(config.delayBetweenMs / 1000);
    const recentActionResult = await pool.query(
      `SELECT EXTRACT(EPOCH FROM (NOW() - executed_at)) as elapsed_seconds
       FROM linkedin_actions_queue
       WHERE action_type = $1
         AND status = 'completed'
         AND executed_at IS NOT NULL
       ORDER BY executed_at DESC LIMIT 1`,
      [actionType]
    );

    if (recentActionResult.rows.length > 0) {
      const elapsedSeconds = parseFloat(recentActionResult.rows[0].elapsed_seconds);
      const waitRemaining = delaySeconds - elapsedSeconds;
      console.log(`[RATE LIMITER] ${actionType}: delay check — elapsed=${Math.round(elapsedSeconds)}s, required=${delaySeconds}s, remaining=${Math.round(waitRemaining)}s`);

      if (waitRemaining > 0) {
        const secondsLeft = Math.ceil(waitRemaining);
        return {
          allowed: false,
          reason: `⏱️ Délai minimum non respecté pour les ${config.label}. Attendez encore ${secondsLeft} seconde(s) pour éviter une détection LinkedIn.`,
          dailyUsed,
          dailyMax: config.maxPerDay,
          hourlyUsed,
          hourlyMax: config.maxPerHour,
          remainingToday: config.maxPerDay - dailyUsed,
        };
      }
    }

    // Tout est OK
    return {
      allowed: true,
      dailyUsed,
      dailyMax: config.maxPerDay,
      hourlyUsed,
      hourlyMax: config.maxPerHour,
      remainingToday: config.maxPerDay - dailyUsed - 1,
    };
  } catch (error) {
    // En cas d'erreur DB, bloquer par sécurité
    console.error("Rate limiter DB error:", error);
    return {
      allowed: false,
      reason: "Erreur lors de la vérification des limites. Action bloquée par sécurité.",
      dailyUsed: 0,
      dailyMax: config.maxPerDay,
      hourlyUsed: 0,
      hourlyMax: config.maxPerHour,
      remainingToday: 0,
    };
  }
}

// Récupérer un résumé complet des limites actuelles
export async function getRateLimitStatus(): Promise<Record<ActionType, RateLimitResult>> {
  const types: ActionType[] = ["send_connection", "send_message", "visit_profile", "search", "schedule_followup"];
  const results: Partial<Record<ActionType, RateLimitResult>> = {};

  for (const type of types) {
    results[type] = await checkRateLimit(type);
  }

  return results as Record<ActionType, RateLimitResult>;
}

// Formater un message de statut des limites
export function formatRateLimitStatus(status: Record<ActionType, RateLimitResult>): string {
  const lines = [
    "📊 **Statut des limites LinkedIn aujourd'hui:**",
    "",
    `🔗 Connexions: ${status.send_connection.dailyUsed}/${status.send_connection.dailyMax} (${status.send_connection.remainingToday} restantes)`,
    `💬 Messages: ${status.send_message.dailyUsed}/${status.send_message.dailyMax} (${status.send_message.remainingToday} restants)`,
    `👤 Visites profils: ${status.visit_profile.dailyUsed}/${status.visit_profile.dailyMax} (${status.visit_profile.remainingToday} restantes)`,
    `🔍 Recherches: ${status.search.dailyUsed}/${status.search.dailyMax} (${status.search.remainingToday} restantes)`,
    `📅 Follow-ups: ${status.schedule_followup.dailyUsed}/${status.schedule_followup.dailyMax} (${status.schedule_followup.remainingToday} restants)`,
  ];
  return lines.join("\n");
}
