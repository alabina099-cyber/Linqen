import { pool } from "./db";
import { LINKEDIN_LIMITS } from "./agent-config";

// =============================================
// LinkedIn Rate Limiter
// Checks daily AND hourly limits before each action
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
    label: "profile visits",
  },
  search: {
    maxPerDay: LINKEDIN_LIMITS.maxSearchesPerDay,
    maxPerHour: Math.ceil(LINKEDIN_LIMITS.maxSearchesPerDay / 8),
    delayBetweenMs: LINKEDIN_LIMITS.delayBetweenSearches,
    label: "searches",
  },
  schedule_followup: {
    maxPerDay: LINKEDIN_LIMITS.maxFollowupsPerDay,
    maxPerHour: Math.ceil(LINKEDIN_LIMITS.maxFollowupsPerDay / 8),
    delayBetweenMs: LINKEDIN_LIMITS.delayBetweenActions,
    label: "scheduled follow-ups",
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

// Check if an action is allowed according to LinkedIn limits
export async function checkRateLimit(actionType: ActionType): Promise<RateLimitResult> {
  const config = RATE_LIMITS[actionType];

  try {
    // Count only COMPLETED actions with executed_at today
    // executed_at = actual execution time (not created_at which is queue time)
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

    // Count completed actions in the last hour (based on executed_at)
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

    // Check daily limit
    if (dailyUsed >= config.maxPerDay) {
      return {
        allowed: false,
        reason: `🚫 Daily limit reached for ${config.label} (${dailyUsed}/${config.maxPerDay}). Try again tomorrow after midnight.`,
        dailyUsed,
        dailyMax: config.maxPerDay,
        hourlyUsed,
        hourlyMax: config.maxPerHour,
        remainingToday: 0,
      };
    }

    // Check hourly limit
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
        ? new Date(new Date(oldestInWindow.rows[0].executed_at).getTime() + 3600000).toLocaleTimeString("en-US")
        : "in ~1 hour";

      return {
        allowed: false,
        reason: `⏳ Hourly limit reached for ${config.label} (${hourlyUsed}/${config.maxPerHour} this hour). Next available slot: ${nextAllowed}.`,
        dailyUsed,
        dailyMax: config.maxPerDay,
        hourlyUsed,
        hourlyMax: config.maxPerHour,
        nextAllowedAt: nextAllowed,
        remainingToday: config.maxPerDay - dailyUsed,
      };
    }

    // Check minimum delay since last completed action of same type
    // IMPORTANT: Entirely SQL-based comparison to avoid JS/DB timezone drift
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
          reason: `⏱️ Minimum delay not respected for ${config.label}. Wait ${secondsLeft} more second(s) to avoid LinkedIn detection.`,
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
    // In case of DB error, block for safety
    console.error("Rate limiter DB error:", error);
    return {
      allowed: false,
      reason: "Error checking limits. Action blocked for safety.",
      dailyUsed: 0,
      dailyMax: config.maxPerDay,
      hourlyUsed: 0,
      hourlyMax: config.maxPerHour,
      remainingToday: 0,
    };
  }
}

// Get a full summary of current limits
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
