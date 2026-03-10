import { NextRequest, NextResponse } from "next/server";
import { getLinkedInAgent } from "@/lib/agent";
import { z } from "zod";

// Schéma de validation
const chatSchema = z.object({
  message: z.string().min(1),
  context: z.record(z.string(), z.unknown()).optional(),
});

// POST /api/agent/chat
export async function POST(request: NextRequest) {
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

    const { message, context } = result.data;

    // Vérifier la clé API
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Clé API OpenAI manquante. Ajoutez OPENAI_API_KEY dans .env.local" },
        { status: 500 }
      );
    }

    // Obtenir l'agent et envoyer le message
    const agent = getLinkedInAgent();
    const response = await agent.chat(message, context);

    return NextResponse.json({
      success: true,
      response,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Agent API Error:", error);
    return NextResponse.json(
      { 
        error: "Erreur lors du traitement",
        message: error instanceof Error ? error.message : "Erreur inconnue"
      },
      { status: 500 }
    );
  }
}

// GET /api/agent/history
export async function GET() {
  try {
    const agent = getLinkedInAgent();
    const history = agent.getHistory();

    return NextResponse.json({
      success: true,
      history,
    });
  } catch (error) {
    console.error("History API Error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'historique" },
      { status: 500 }
    );
  }
}

// DELETE /api/agent/history
export async function DELETE() {
  try {
    const agent = getLinkedInAgent();
    agent.clearHistory();

    return NextResponse.json({
      success: true,
      message: "Historique effacé",
    });
  } catch (error) {
    console.error("Clear History Error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'effacement de l'historique" },
      { status: 500 }
    );
  }
}
