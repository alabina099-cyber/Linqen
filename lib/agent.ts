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

  // Envoyer un message à l'agent
  async chat(userMessage: string, context?: Record<string, unknown>): Promise<string> {
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

Tu es un agent IA autonome pour LinkedIn. Tu dois:
1. Comprendre les demandes de l'utilisateur
2. Utiliser les tools appropriés pour exécuter les actions
3. Fournir des réponses claires et structurées en français
4. Toujours respecter les limites LinkedIn (100 connexions/jour max)
5. Être proactif et suggérer des actions pertinentes`),
        ...this.history,
        new HumanMessage(input),
      ];

      // Appel au LLM
      const response = await llm.invoke(messages);

      // Vérifier s'il y a des tool calls
      if (response.tool_calls && response.tool_calls.length > 0) {
        let toolResults = "";

        for (const toolCall of response.tool_calls) {
          const tool = TOOLS_MAP[toolCall.name];
          if (tool) {
            try {
              const result = await tool.invoke(toolCall.args);
              toolResults += `\n[Résultat de ${toolCall.name}]: ${result}`;
            } catch (toolError) {
              toolResults += `\n[Erreur ${toolCall.name}]: ${toolError instanceof Error ? toolError.message : "Erreur"}`;
            }
          }
        }

        // Deuxième appel avec les résultats des tools
        const followUpMessages: BaseMessage[] = [
          ...messages,
          new AIMessage(response.content?.toString() || ""),
          new HumanMessage(`Voici les résultats des actions exécutées:${toolResults}\n\nRésume les résultats de manière claire pour l'utilisateur.`),
        ];

        const finalLlm = new ChatOpenAI({
          modelName: OPENAI_CONFIG.model,
          temperature: OPENAI_CONFIG.temperature,
          maxTokens: OPENAI_CONFIG.maxTokens,
          openAIApiKey: process.env.OPENAI_API_KEY,
        });

        const finalResponse = await finalLlm.invoke(followUpMessages);
        const output = finalResponse.content?.toString() || "Action exécutée avec succès.";

        this.addToHistory(userMessage, output);
        return output;
      }

      // Réponse simple sans tool call
      const output = response.content?.toString() || "Je suis prêt à vous aider.";
      this.addToHistory(userMessage, output);
      return output;

    } catch (error) {
      console.error("Agent error:", error);
      const errorMsg = error instanceof Error ? error.message : "Erreur inconnue";

      if (errorMsg.includes("API key") || errorMsg.includes("401") || errorMsg.includes("Unauthorized")) {
        return "Erreur: Clé API OpenAI invalide ou manquante. Vérifiez OPENAI_API_KEY dans .env.local.";
      }
      if (errorMsg.includes("model") || errorMsg.includes("404")) {
        return "Erreur: Modèle non trouvé. Vérifiez OPENAI_MODEL dans .env.local.";
      }

      return `Désolé, j'ai rencontré une erreur: ${errorMsg}. Veuillez réessayer.`;
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
