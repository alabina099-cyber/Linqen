import { ChatOpenAI } from "@langchain/openai";
import { AIMessage, HumanMessage, SystemMessage, BaseMessage } from "@langchain/core/messages";
import { OPENAI_CONFIG, SYSTEM_PROMPTS } from "./agent-config";
import { ALL_TOOLS, TOOLS_MAP } from "./tools";

// Type pour les messages
export interface AgentMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
}

export interface ToolStep {
  toolName: string;
  args: Record<string, unknown>;
  result: string;
  status: "success" | "error";
  timestamp: string;
}

export interface AgentChatResult {
  response: string;
  toolSteps: ToolStep[];
}

// Créer le modèle LLM avec OpenAI + tool binding
function createBoundLLM() {
  const llm = new ChatOpenAI({
    modelName: OPENAI_CONFIG.model,
    temperature: OPENAI_CONFIG.temperature,
    maxTokens: OPENAI_CONFIG.maxTokens,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  return llm.bindTools(ALL_TOOLS);
}

// Classe principale pour gérer l'agent
export class LinkedInAgent {
  private history: BaseMessage[] = [];
  private maxHistory = 20;

  // Envoyer un message à l'agent — boucle multi-tool pour chaîner les actions
  async chat(userMessage: string, context?: Record<string, unknown>): Promise<AgentChatResult> {
    const toolSteps: ToolStep[] = [];
    const MAX_TOOL_ROUNDS = 6; // Max 6 rounds de tool calls pour éviter les boucles infinies

    try {
      const llm = createBoundLLM();

      // Construire le prompt avec contexte
      let input = userMessage;
      if (context) {
        input = `[Contexte: ${JSON.stringify(context)}]\n\n${userMessage}`;
      }

      // Messages pour le LLM
      const messages: BaseMessage[] = [
        new SystemMessage(`${SYSTEM_PROMPTS.prospecting}

RAPPEL CRITIQUE:
- TOUTES les actions passent par la file d'approbation. AUCUNE action ne s'exécute directement.
- Quand on te demande d'envoyer un message → appelle linkedin_send_message DIRECTEMENT (pas de check_network_connections).
- Quand on te demande d'envoyer une connexion → appelle linkedin_send_connection DIRECTEMENT.
- Ne JAMAIS afficher un message à copier-coller. TOUJOURS utiliser le tool pour créer l'action.
- Si l'URL LinkedIn du prospect manque, DEMANDE-LA d'abord.
- N'appelle PAS check_network_connections ni get_connection_results. Ces tools ne sont plus utilisés.
- Réponds toujours en français, de manière claire et structurée.`),
        ...this.history,
        new HumanMessage(input),
      ];

      // Boucle multi-tool: le LLM peut appeler des tools, recevoir les résultats,
      // puis décider d'appeler d'autres tools — jusqu'à ce qu'il donne une réponse finale
      let currentMessages = [...messages];
      let finalOutput = "";

      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const response = await llm.invoke(currentMessages);

        // Si pas de tool calls → c'est la réponse finale
        if (!response.tool_calls || response.tool_calls.length === 0) {
          finalOutput = response.content?.toString() || "Action exécutée avec succès.";
          break;
        }

        // Exécuter les tool calls
        let toolResults = "";
        for (const toolCall of response.tool_calls) {
          const tool = TOOLS_MAP[toolCall.name];
          if (tool) {
            try {
              const result = await tool.invoke(toolCall.args);
              const resultStr = typeof result === "string" ? result : JSON.stringify(result);
              toolResults += `\n[Résultat de ${toolCall.name}]: ${resultStr}`;
              toolSteps.push({
                toolName: toolCall.name,
                args: toolCall.args as Record<string, unknown>,
                result: resultStr,
                status: "success",
                timestamp: new Date().toISOString(),
              });
            } catch (toolError) {
              const errMsg = toolError instanceof Error ? toolError.message : "Erreur";
              toolResults += `\n[Erreur ${toolCall.name}]: ${errMsg}`;
              toolSteps.push({
                toolName: toolCall.name,
                args: toolCall.args as Record<string, unknown>,
                result: errMsg,
                status: "error",
                timestamp: new Date().toISOString(),
              });
            }
          }
        }

        // Ajouter la réponse de l'assistant + résultats des tools aux messages
        currentMessages.push(new AIMessage(response.content?.toString() || ""));
        currentMessages.push(new HumanMessage(
          `Résultats des tools exécutés:${toolResults}\n\nContinue le workflow: si tu as encore des étapes à faire (vérifier les résultats, envoyer un message, etc.), appelle le prochain tool. Sinon, donne ta réponse finale à l'utilisateur.`
        ));
      }

      // Si on a atteint MAX_TOOL_ROUNDS sans réponse finale
      if (!finalOutput) {
        finalOutput = "Les actions ont été exécutées. Consultez l'onglet Approbations pour les détails.";
      }

      this.addToHistory(userMessage, finalOutput);
      return { response: finalOutput, toolSteps };

    } catch (error) {
      console.error("Agent error:", error);
      const errorMsg = error instanceof Error ? error.message : "Erreur inconnue";

      if (errorMsg.includes("API key") || errorMsg.includes("401") || errorMsg.includes("Unauthorized")) {
        return { response: "Erreur: Clé API OpenAI invalide ou manquante. Vérifiez OPENAI_API_KEY dans .env.local.", toolSteps };
      }
      if (errorMsg.includes("model") || errorMsg.includes("404")) {
        return { response: "Erreur: Modèle non trouvé. Vérifiez OPENAI_MODEL dans .env.local.", toolSteps };
      }

      return { response: `Désolé, j'ai rencontré une erreur: ${errorMsg}. Veuillez réessayer.`, toolSteps };
    }
  }

  // Ajouter à l'historique (avec limite)
  private addToHistory(userMessage: string, assistantResponse: string) {
    this.history.push(new HumanMessage(userMessage));
    this.history.push(new AIMessage(assistantResponse));

    if (this.history.length > this.maxHistory * 2) {
      this.history = this.history.slice(-this.maxHistory * 2);
    }
  }

  // Effacer l'historique
  clearHistory() {
    this.history = [];
  }

  // Restaurer l'historique depuis des messages DB (pour reprendre une conversation)
  restoreHistory(messages: { role: string; content: string }[]) {
    this.history = [];
    for (const msg of messages) {
      if (msg.role === "user") {
        this.history.push(new HumanMessage(msg.content));
      } else if (msg.role === "assistant") {
        this.history.push(new AIMessage(msg.content));
      }
    }
    // Limiter
    if (this.history.length > this.maxHistory * 2) {
      this.history = this.history.slice(-this.maxHistory * 2);
    }
  }

  // Obtenir l'historique
  getHistory(): AgentMessage[] {
    return this.history.map((msg) => ({
      role: msg instanceof HumanMessage ? ("user" as const) : ("assistant" as const),
      content: msg.content.toString(),
      timestamp: new Date(),
    }));
  }
}

// Instance singleton de l'agent
let agentInstance: LinkedInAgent | null = null;

export function getLinkedInAgent(): LinkedInAgent {
  if (!agentInstance) {
    agentInstance = new LinkedInAgent();
  }
  return agentInstance;
}
