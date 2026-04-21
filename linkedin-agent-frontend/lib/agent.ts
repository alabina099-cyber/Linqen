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
- Quand on te demande d'envoyer un message à UN prospect connu → appelle linkedin_send_message DIRECTEMENT.
- Quand on te demande d'envoyer une connexion → appelle linkedin_send_connection DIRECTEMENT.
- Quand on te demande de chercher dans le réseau et contacter des gens → WORKFLOW B:
  Appelle linkedin_search(network='F', message_template='...') avec un message personnalisé.
  Le message_template peut contenir {name} qui sera remplacé automatiquement.
  L'extension fait tout: recherche → profils → envoie les messages.
- MULTI-CATÉGORIES: Si l'utilisateur mentionne PLUSIEURS groupes/catégories (ex: "étudiants ESIEA et employés Phinia"), tu DOIS faire UN appel linkedin_search SÉPARÉ pour CHAQUE catégorie. LinkedIn cherche en AND pas en OR. Appelle linkedin_search plusieurs fois dans la même réponse.
- IMPORTANT: Quand l'utilisateur veut chercher ET envoyer un message, TOUJOURS inclure message_template dans linkedin_search. Rédige toi-même le message personnalisé.
- IMPORTANT: Après linkedin_search, NE PAS appeler get_search_results ou bulk_send_messages. Tout est automatique.
- Ne JAMAIS afficher un message à copier-coller. TOUJOURS utiliser le tool pour créer l'action.
- Si l'utilisateur ne fournit PAS de nom/URL → utiliser linkedin_search pour trouver les prospects, PAS demander le nom/URL.
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

        // Exécuter les tool calls (TOUS les appels parallèles d'un même batch)
        let toolResults = "";
        let actionsCreatedCount = 0;
        // Tools qui stoppent la boucle après exécution: recherche (attend approbation) + envoi
        const STOP_LOOP_TOOLS = ["linkedin_search", "linkedin_send_message", "linkedin_send_connection", "bulk_send_messages"];

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
              // Compter les actions LinkedIn créées
              if (STOP_LOOP_TOOLS.includes(toolCall.name) && resultStr.includes('"success":true')) {
                actionsCreatedCount++;
              }
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

        // Si des actions LinkedIn ont été créées → STOP, pas besoin de continuer la boucle
        if (actionsCreatedCount > 0) {
          const plural = actionsCreatedCount > 1 ? `${actionsCreatedCount} actions ont été créées` : "L'action a été créée";
          currentMessages.push(new AIMessage(response.content?.toString() || ""));
          currentMessages.push(new HumanMessage(
            `Résultats des tools exécutés:${toolResults}\n\n${plural} avec succès. NE RAPPELLE PAS le même tool. Donne ta réponse finale à l'utilisateur pour confirmer les ${actionsCreatedCount} action(s) créée(s).`
          ));
          // Un dernier round pour la réponse finale uniquement
          const finalResponse = await llm.invoke(currentMessages);
          finalOutput = finalResponse.content?.toString() || "Action créée avec succès.";
          break;
        }

        // Ajouter la réponse de l'assistant + résultats des tools aux messages
        currentMessages.push(new AIMessage(response.content?.toString() || ""));
        currentMessages.push(new HumanMessage(
          `Résultats des tools exécutés:${toolResults}\n\nContinue le workflow si nécessaire. NE RAPPELLE PAS un tool déjà appelé avec les mêmes arguments. Sinon, donne ta réponse finale.`
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
