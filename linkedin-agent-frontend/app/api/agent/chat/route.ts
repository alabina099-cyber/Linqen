import { NextRequest, NextResponse } from "next/server";
import { getLinkedInAgent } from "@/lib/agent";
import { query } from "@/lib/db";
import { z } from "zod";
import crypto from "crypto";
import { getRequestUser, getScopeUserIds } from "@/lib/requestAuth";
import { agentContext } from "@/lib/agent-context";

// Ensure tables and columns exist
let schemaReady = false;
async function ensureSchema() {
  if (schemaReady) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS agent_chat_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        role VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        context JSONB,
        conversation_id VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // In case the table existed but without conversation_id
    await query(`ALTER TABLE agent_chat_history ADD COLUMN IF NOT EXISTS conversation_id VARCHAR(36)`);
    await query(`ALTER TABLE agent_chat_history ADD COLUMN IF NOT EXISTS user_id INTEGER`);
    await query(`CREATE INDEX IF NOT EXISTS idx_agent_chat_conv ON agent_chat_history(conversation_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_agent_chat_user ON agent_chat_history(user_id)`);
    await query(`
      CREATE TABLE IF NOT EXISTS agent_tool_steps (
        id SERIAL PRIMARY KEY,
        conversation_id VARCHAR(36) NOT NULL,
        tool_name VARCHAR(100) NOT NULL,
        args JSONB,
        result TEXT,
        status VARCHAR(20) DEFAULT 'success',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (e) {
    console.error("Schema migration error (non-fatal):", e);
  }
  schemaReady = true;
}

// Schéma de validation
const chatSchema = z.object({
  message: z.string().min(1),
  conversationId: z.string().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

// POST /api/agent/chat
export async function POST(request: NextRequest) {
  await ensureSchema();
  try {
    const body = await request.json();

    // Validation
    const result = chatSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Données invalides", details: result.error.format() },
        { status: 400 }
      );
    }

    const { message, context, conversationId } = result.data;
    const convId = conversationId || crypto.randomUUID();

    // Identifier l'utilisateur courant (pour isolation des conversations)
    const requestUser = await getRequestUser(request);
    const ownerId: number | null = requestUser?.userId ?? null;

    // Vérifier la clé API
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Clé API OpenAI manquante. Ajoutez OPENAI_API_KEY dans .env.local" },
        { status: 500 }
      );
    }

    // Lire les settings de l'utilisateur courant (modèle, ton, détection langue)
    let chosenModel: string | undefined;
    let enrichedContext = context || {};
    try {
      const settingsResult = ownerId
        ? await query('SELECT settings FROM users WHERE id = $1', [ownerId])
        : await query("SELECT settings FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1");
      const settings = settingsResult.rows[0]?.settings || {};
      chosenModel = settings.aiModel || undefined;
      const aiCfg = settings.ai || {};
      const toneMap: Record<string, string> = {
        professional: 'professionnel et courtois',
        friendly:     'amical et chaleureux',
        formal:       'formel et soutenu',
        casual:       'décontracté et naturel',
      };
      enrichedContext = {
        ...enrichedContext,
        tone: toneMap[aiCfg.tone || 'professional'] || 'professionnel et courtois',
        autoDetectLanguage: aiCfg.autoDetectLanguage !== false,
      };
    } catch {}

    // Obtenir l'agent et envoyer le message avec le modèle et le contexte enrichis
    const agent = getLinkedInAgent();
    const agentResult = await agentContext.run({ userId: ownerId }, () =>
      agent.chat(message, enrichedContext, chosenModel)
    );

    // Sauvegarder les messages dans l'historique (avec user_id pour isolation)
    try {
      await query(
        `INSERT INTO agent_chat_history (user_id, role, content, context, conversation_id, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW()), ($1, $6, $7, $4, $5, NOW())`,
        [ownerId, "user", message, JSON.stringify(context || {}), convId, "assistant", agentResult.response]
      );
    } catch (historyError) {
      console.error("Agent history persistence error:", historyError);
    }

    // Sauvegarder les tool steps
    if (agentResult.toolSteps.length > 0) {
      try {
        for (const step of agentResult.toolSteps) {
          await query(
            `INSERT INTO agent_tool_steps (conversation_id, tool_name, args, result, status, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [convId, step.toolName, JSON.stringify(step.args), step.result.substring(0, 5000), step.status]
          );
        }
      } catch (stepError) {
        console.error("Tool steps persistence error:", stepError);
      }
    }

    return NextResponse.json({
      success: true,
      response: agentResult.response,
      toolSteps: agentResult.toolSteps,
      conversationId: convId,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Agent API Error:", error);
    return NextResponse.json(
      {
        success: false,
        response: "Je n'ai pas pu terminer cette demande pour le moment. Vérifiez la configuration de l'agent ou réessayez dans quelques instants.",
      },
      { status: 200 }
    );
  }
}

// GET /api/agent/chat — Conversations de l'utilisateur courant (admin = toute l'équipe)
export async function GET(request: NextRequest) {
  await ensureSchema();
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ success: true, conversations: [], history: [] });
    }

    // Scope des user_id visibles
    const scopeIds = await getScopeUserIds(user);
    const isAdmin = user.role === "admin";

    const { searchParams } = new URL(request.url);
    const convId = searchParams.get("conversationId");

    // Conversation spécifique : vérifier l'accès puis renvoyer les messages
    if (convId) {
      // Vérifier la propriété de la conversation
      const ownerCheck = await query(
        `SELECT DISTINCT user_id FROM agent_chat_history WHERE conversation_id = $1`,
        [convId]
      );
      if (ownerCheck.rows.length > 0) {
        const owners = ownerCheck.rows.map((r) => r.user_id);
        const allowed = owners.some(
          (oid: number | null) => (oid == null ? isAdmin : scopeIds.includes(oid))
        );
        if (!allowed) {
          return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
        }
      }

      const messagesResult = await query(
        `SELECT id, role, content, created_at
         FROM agent_chat_history
         WHERE conversation_id = $1
         ORDER BY created_at ASC`,
        [convId]
      );

      if (messagesResult.rows.length > 0) {
        const agent = getLinkedInAgent();
        agent.restoreHistory(
          messagesResult.rows.map((row) => ({
            role: row.role,
            content: row.content,
          }))
        );
      }

      return NextResponse.json({
        success: true,
        history: messagesResult.rows.map((row) => ({
          id: String(row.id),
          role: row.role,
          content: row.content,
          timestamp: row.created_at,
        })),
      });
    }

    // Liste des conversations (filtrée par scope utilisateur)
    // Admin : inclut aussi les conversations legacy (user_id IS NULL)
    const scopeClause = isAdmin
      ? `(user_id = ANY($1) OR user_id IS NULL)`
      : `user_id = ANY($1)`;

    const conversationsResult = await query(
      `SELECT
        conversation_id,
        MIN(created_at) as started_at,
        MAX(created_at) as last_message_at,
        COUNT(*) as message_count,
        (SELECT content FROM agent_chat_history h2
         WHERE h2.conversation_id = h1.conversation_id AND h2.role = 'user'
         ORDER BY h2.created_at ASC LIMIT 1) as first_message,
        (SELECT MAX(user_id) FROM agent_chat_history h3
         WHERE h3.conversation_id = h1.conversation_id) as owner_id
       FROM agent_chat_history h1
       WHERE conversation_id IS NOT NULL AND ${scopeClause}
       GROUP BY conversation_id
       ORDER BY MAX(created_at) DESC
       LIMIT 50`,
      [scopeIds]
    );

    // Récupérer les noms des propriétaires pour l'attribution (admin)
    let ownerNames: Record<number, string> = {};
    if (isAdmin) {
      const ownerIds = conversationsResult.rows
        .map((r) => r.owner_id)
        .filter((id) => id != null);
      if (ownerIds.length > 0) {
        const namesResult = await query(
          `SELECT id, name FROM users WHERE id = ANY($1)`,
          [ownerIds]
        );
        ownerNames = Object.fromEntries(namesResult.rows.map((r) => [r.id, r.name]));
      }
    }

    const latestResult = await query(
      `SELECT id, role, content, created_at, conversation_id
       FROM agent_chat_history
       WHERE ${scopeClause}
       ORDER BY created_at ASC
       LIMIT 100`,
      [scopeIds]
    );

    return NextResponse.json({
      success: true,
      conversations: conversationsResult.rows.map((row) => ({
        id: row.conversation_id,
        firstMessage: row.first_message || "Conversation",
        startedAt: row.started_at,
        lastMessageAt: row.last_message_at,
        messageCount: Number(row.message_count),
        ownerId: row.owner_id ?? null,
        ownerName: row.owner_id != null ? ownerNames[row.owner_id] ?? null : null,
      })),
      history: latestResult.rows.map((row) => ({
        id: String(row.id),
        role: row.role,
        content: row.content,
        timestamp: row.created_at,
        conversationId: row.conversation_id,
      })),
    });
  } catch (error) {
    console.error("History API Error:", error);
    return NextResponse.json({
      success: true,
      conversations: [],
      history: [],
    });
  }
}

// DELETE /api/agent/chat — Supprimer une conversation ou réinitialiser l'historique mémoire
export async function DELETE(request: NextRequest) {
  await ensureSchema();
  try {
    const { searchParams } = new URL(request.url);
    const convId = searchParams.get("conversationId");

    if (convId) {
      // Vérifier l'accès avant suppression
      const user = await getRequestUser(request);
      if (user) {
        const scopeIds = await getScopeUserIds(user);
        const isAdmin = user.role === "admin";
        const ownerCheck = await query(
          `SELECT DISTINCT user_id FROM agent_chat_history WHERE conversation_id = $1`,
          [convId]
        );
        if (ownerCheck.rows.length > 0) {
          const owners = ownerCheck.rows.map((r) => r.user_id);
          const allowed = owners.some(
            (oid: number | null) => (oid == null ? isAdmin : scopeIds.includes(oid))
          );
          if (!allowed) {
            return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
          }
        }
      }

      await query(`DELETE FROM agent_chat_history WHERE conversation_id = $1`, [convId]);
      await query(`DELETE FROM agent_tool_steps WHERE conversation_id = $1`, [convId]);

      const agent = getLinkedInAgent();
      agent.clearHistory();

      return NextResponse.json({
        success: true,
        message: "Conversation supprimée définitivement",
      });
    }

    const agent = getLinkedInAgent();
    agent.clearHistory();

    return NextResponse.json({
      success: true,
      message: "Nouvelle conversation créée",
    });
  } catch (error) {
    console.error("Delete conversation error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la conversation" },
      { status: 500 }
    );
  }
}
