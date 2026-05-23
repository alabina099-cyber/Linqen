"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Send, 
  Bot, 
  User, 
  HelpCircle, 
  Loader2, 
  Trash2,
  Target,
  MessageSquare,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Link2,
  Link as LinkIcon,
  Search,
  UserRound,
  UserPlus,
  CheckSquare,
  RefreshCw,
  Rocket,
  Megaphone,
  Radio,
  Scan,
  PenTool,
  Lightbulb,
  History,
  Check,
  X,
  ClipboardList,
  Square,
  Play,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isLoading?: boolean;
  conversationId?: string;
}

interface Conversation {
  id: string;
  firstMessage: string;
  startedAt: string;
  lastMessageAt: string;
  messageCount: number;
}

interface ActivityItem {
  id: string;
  itemType: "linkedin_action" | "followup" | "campaign" | "tool_step";
  actionId: number;
  actionType: string;
  title: string;
  description: string;
  detail: string;
  status: string;
  statusLabel: string;
  targetName?: string | null;
  targetUrl?: string | null;
  campaignId?: number | null;
  prospectId?: number | null;
  createdAt: string;
  executedAt?: string | null;
  errorMessage?: string | null;
  priority: "high" | "medium" | "low";
}

const welcomeMessage: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Bonjour ! Je pilote votre prospection LinkedIn avec l'IA, le backend du projet et l'extension Chrome.Je peux préparer des recherches, créer des actions LinkedIn, planifier des relances et vous expliquer exactement ce qui est en attente, approuvé, exécuté ou bloqué.\n\nDites-moi votre objectif et je m'occupe du reste.",
  timestamp: new Date().toISOString(),
};

function formatDateLabel(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Date inconnue";
  const day = date.toLocaleString("fr-FR", { day: "2-digit", month: "short" }).replace(/\.$/, "");
  const year = String(date.getFullYear()).slice(-2);
  const time = date.toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${day} ${year}, ${time}`;
}

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "À l'instant";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return "À l'instant";
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
  if (diffMinutes < 1440) return `Il y a ${Math.floor(diffMinutes / 60)} h`;
  return `Il y a ${Math.floor(diffMinutes / 1440)} j`;
}

function getActivityIcon(actionType: string) {
  if (actionType === "search" || actionType === "linkedin_search") return Search;
  if (actionType === "search_and_message") return MessageSquare;
  if (actionType === "visit_profile" || actionType === "linkedin_visit_profile") return User;
  if (actionType === "send_connection" || actionType === "linkedin_send_connection") return LinkIcon;
  if (actionType === "send_message" || actionType === "linkedin_send_message") return MessageSquare;
  if (actionType === "search_and_connection") return UserPlus;
  if (actionType === "check_connection") return CheckSquare;
  if (actionType === "scheduled_followup" || actionType === "schedule_followup") return Clock;
  if (actionType === "create_campaign" || actionType === "update_campaign") return Radio;
  if (actionType === "analyze_prospect") return Scan;
  if (actionType === "generate_message") return PenTool;
  if (actionType === "suggest_strategy") return Lightbulb;
  if (actionType === "save_prospect" || actionType === "search_prospects_db") return User;
  if (actionType === "check_network_connections") return LinkIcon;
  if (actionType === "get_campaign_stats" || actionType === "get_rate_limits") return TrendingUp;
  return HelpCircle;
}

function getActionLabel(actionType: string) {
  const labels: Record<string, string> = {
    search: "Recherche LinkedIn",
    linkedin_search: "Recherche LinkedIn",
    search_and_message: "Recherche et Envoi de message",
    search_and_connection: "Recherche et Envoi de connexion",
    visit_profile: "Visiter profil",
    linkedin_visit_profile: "Visiter profil",
    send_connection: "Demande de connexion",
    linkedin_send_connection: "Demande de connexion",
    send_message: "Envoyer un message",
    linkedin_send_message: "Envoyer un message",
    check_connection: "Vérification réseau",
    scheduled_followup: "Suivi programmé",
    schedule_followup: "Suivi programmé",
    create_campaign: "Créer une campagne",
    update_campaign: "Mettre à jour une campagne",
    analyze_prospect: "Analyser un prospect",
    generate_message: "Générer un message",
    suggest_strategy: "Suggérer une stratégie",
    save_prospect: "Enregistrer un prospect",
    search_prospects_db: "Rechercher dans la base",
    check_network_connections: "Vérifier le réseau",
    get_campaign_stats: "Voir les statistiques",
    get_rate_limits: "Voir les limites",
  };
  return labels[actionType] || actionType;
}

function getActionBadgeColor(status: string) {
  switch (status) {
    case "pending_approval":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "approved":
      return "bg-green-100 text-green-700 border-green-200";
    case "processing":
      return "bg-indigo-100 text-indigo-700 border-indigo-200";
    case "completed":
    case "sent":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "success":
      return "bg-green-100 text-green-700 border-green-200";
    case "stopped":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "failed":
    case "rejected":
    case "cancelled":
      return "bg-red-100 text-red-700 border-red-200";
    case "draft":
      return "bg-slate-100 text-slate-700 border-slate-200";
    case "active":
      return "bg-green-100 text-green-700 border-green-200";
    case "paused":
      return "bg-amber-100 text-amber-700 border-amber-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

function getStatusStyles(status: string) {
  if (status === "pending_approval") {
    return {
      badge: "bg-yellow-100 text-yellow-800 border-yellow-300",
      dot: "bg-yellow-400",
      border: "border-yellow-200/80",
      panel: "bg-yellow-50/70",
      icon: Clock,
      iconColor: "text-yellow-600",
    };
  }

  if (status === "approved") {
    return {
      badge: "bg-green-100 text-green-800 border-green-300",
      dot: "bg-green-400",
      border: "border-green-200/80",
      panel: "bg-green-50/70",
      icon: Check,
      iconColor: "text-green-600",
    };
  }

  if (status === "processing") {
    return {
      badge: "bg-indigo-100 text-indigo-800 border-indigo-300 animate-pulse",
      dot: "bg-indigo-500 animate-pulse",
      border: "border-indigo-200/80",
      panel: "bg-indigo-50/70",
      icon: RefreshCw,
      iconColor: "text-indigo-600",
    };
  }

  if (status === "completed" || status === "sent") {
    return {
      badge: "bg-blue-100 text-blue-800 border-blue-300",
      dot: "bg-blue-400",
      border: "border-blue-200/80",
      panel: "bg-blue-50/70",
      icon: CheckCircle2,
      iconColor: "text-blue-600",
    };
  }

  if (status === "success") {
    return {
      badge: "bg-green-100 text-green-800 border-green-300",
      dot: "bg-green-400",
      border: "border-green-200/80",
      panel: "bg-green-50/70",
      icon: CheckCircle2,
      iconColor: "text-green-600",
    };
  }

  if (status === "stopped") {
    return {
      badge: "bg-orange-100 text-orange-800 border-orange-300",
      dot: "bg-orange-400",
      border: "border-orange-200/80",
      panel: "bg-orange-50/70",
      icon: Square,
      iconColor: "text-orange-600",
    };
  }

  if (status === "failed" || status === "rejected" || status === "cancelled") {
    return {
      badge: "bg-red-100 text-red-800 border-red-300",
      dot: "bg-red-400",
      border: "border-red-200/80",
      panel: "bg-red-50/70",
      icon: AlertTriangle,
      iconColor: "text-red-600",
    };
  }

  if (status === "draft") {
    return {
      badge: "bg-slate-100 text-slate-800 border-slate-300",
      dot: "bg-slate-400",
      border: "border-slate-200/80",
      panel: "bg-slate-50/70",
      icon: Megaphone,
      iconColor: "text-slate-600",
    };
  }

  if (status === "active") {
    return {
      badge: "bg-green-100 text-green-800 border-green-300",
      dot: "bg-green-400",
      border: "border-green-200/80",
      panel: "bg-green-50/70",
      icon: CheckCircle2,
      iconColor: "text-green-600",
    };
  }

  if (status === "paused") {
    return {
      badge: "bg-amber-50 text-amber-700 border-amber-200",
      dot: "bg-amber-400",
      border: "border-amber-200/80",
      panel: "bg-amber-50/70",
      icon: Clock,
      iconColor: "text-amber-600",
    };
  }

  return {
    badge: "bg-slate-50 text-slate-700 border-slate-200",
    dot: "bg-slate-400",
    border: "border-slate-200/80",
    panel: "bg-slate-50/70",
    icon: Clock,
  };
}

function cleanErrorMessage(raw: string): string {
  const errorMap: Record<string, string> = {
    "Type d'action inconnu": "L'extension Chrome doit être mise à jour. Rechargez-la dans chrome://extensions.",
    "Aucun onglet LinkedIn ouvert": "Aucun onglet LinkedIn n'était ouvert. Ouvrez LinkedIn puis réessayez.",
    "Champ message introuvable": "Le champ de message n'a pas été trouvé sur la page LinkedIn.",
    "Aucun message envoyé": "Aucun message n'a pu être envoyé aux profils trouvés.",
    "timeout": "L'action a pris trop de temps et a été interrompue.",
  };

  for (const [key, msg] of Object.entries(errorMap)) {
    if (raw.toLowerCase().includes(key.toLowerCase())) return msg;
  }

  if (raw.length > 120) return raw.substring(0, 120) + "…";
  return raw;
}

export default function AgentChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [timeline, setTimeline] = useState<ActivityItem[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isActivityLoading, setIsActivityLoading] = useState(true);
  const [rightPanelView, setRightPanelView] = useState<"actions" | "history">("actions");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; preview: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll automatique vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus automatique sur l'input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Charger les conversations depuis l'API
  const refreshConversations = async () => {
    try {
      const response = await fetch("/api/agent/chat");
      const data = await response.json();
      if (data.success && data.conversations) {
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error("Erreur chargement conversations:", error);
    }
  };

  // Charger une conversation spécifique
  const loadConversation = async (convId: string) => {
    try {
      const response = await fetch(`/api/agent/chat?conversationId=${convId}`);
      const data = await response.json();
      if (data.success && data.history?.length) {
        setConversationId(convId);
        setMessages(
          data.history.map((msg: Message) => ({
            ...msg,
            timestamp: String(msg.timestamp),
          }))
        );
      }
    } catch (error) {
      console.error("Erreur chargement conversation:", error);
    }
  };

  useEffect(() => {
    async function bootstrap() {
      try {
        const [historyResponse, activityResponse] = await Promise.all([
          fetch("/api/agent/chat"),
          fetch("/api/agent/activity"),
        ]);

        const historyData = await historyResponse.json();
        const activityData = await activityResponse.json();

        if (historyData.success) {
          if (historyData.conversations?.length) {
            setConversations(historyData.conversations);
          }
          // Load the latest conversation if available
          const latestConv = historyData.conversations?.[0];
          if (latestConv) {
            setConversationId(latestConv.id);
            // Load messages for that conversation
            const convResponse = await fetch(`/api/agent/chat?conversationId=${latestConv.id}`);
            const convData = await convResponse.json();
            if (convData.success && convData.history?.length) {
              setMessages(
                convData.history.map((message: Message) => ({
                  ...message,
                  timestamp: String(message.timestamp),
                }))
              );
            } else {
              setMessages([welcomeMessage]);
            }
          } else {
            setMessages([welcomeMessage]);
          }
        } else {
          setMessages([welcomeMessage]);
        }

        if (activityData.success) {
          setTimeline(activityData.timeline || []);
        }
      } catch (error) {
        console.error("Erreur lors du chargement de l'espace agent:", error);
        setMessages([welcomeMessage]);
      } finally {
        setIsBootstrapping(false);
        setIsActivityLoading(false);
      }
    }

    bootstrap();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(async () => {
      try {
        const response = await fetch("/api/agent/activity");
        const data = await response.json();
        if (data.success) {
          setTimeline(data.timeline || []);
        }
      } catch (error) {
        console.error("Erreur lors du rafraîchissement des actions:", error);
      }
    }, 4000);

    return () => window.clearInterval(interval);
  }, []);

  const rapidPollRef = useRef<NodeJS.Timeout | null>(null);
  const startRapidPolling = () => {
    if (rapidPollRef.current) clearInterval(rapidPollRef.current);
    let count = 0;
    rapidPollRef.current = setInterval(async () => {
      count++;
      await refreshActivity();
      if (count >= 15) {
        if (rapidPollRef.current) clearInterval(rapidPollRef.current);
        rapidPollRef.current = null;
      }
    }, 2000);
  };
  useEffect(() => {
    return () => { if (rapidPollRef.current) clearInterval(rapidPollRef.current); };
  }, []);

  const refreshActivity = async () => {
    setIsActivityLoading(true);
    try {
      const response = await fetch("/api/agent/activity");
      const data = await response.json();
      if (data.success) {
        setTimeline(data.timeline || []);
      }
    } catch (error) {
      console.error("Erreur lors de l'actualisation des actions:", error);
    } finally {
      setIsActivityLoading(false);
    }
  };

  // Envoyer un message
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => prev.filter((m) => m.id !== "welcome").concat(userMessage));
    setInput("");
    setIsLoading(true);

    // Message temporaire de l'assistant (loading)
    const loadingId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: loadingId, role: "assistant", content: "", timestamp: new Date().toISOString(), isLoading: true },
    ]);

    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          conversationId: conversationId || undefined,
          context: {
            currentPage: window.location.pathname,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      const data = await response.json();

      if (!response.ok && !data.response) {
        throw new Error("Agent request failed");
      }

      // Save the conversationId returned by the API
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }

      // Remplacer le message loading par la vraie réponse
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingId
            ? {
                id: loadingId,
                role: "assistant",
                content: data.response || "Je n'ai pas pu terminer cette demande pour le moment.",
                timestamp: new Date().toISOString(),
                isLoading: false,
              }
            : msg
        )
      );

      refreshActivity();
      refreshConversations();
    } catch (error) {
      setMessages((prev) => prev.filter((msg) => msg.id !== loadingId));
    } finally {
      setIsLoading(false);
    }
  };

  // Nouvelle conversation (trash icon)
  const handleNewConversation = async () => {
    try {
      await fetch("/api/agent/chat", { method: "DELETE" });
      setConversationId(null);
      setMessages([welcomeMessage]);
      refreshConversations();
    } catch (error) {
      console.error("Erreur lors de la création:", error);
    }
  };

  // Ouvrir le modal de confirmation de suppression
  const askDeleteConversation = (convId: string, preview: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget({ id: convId, preview: preview.substring(0, 60) + (preview.length > 60 ? "..." : "") });
  };

  // Confirmer la suppression définitive
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/agent/chat?conversationId=${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        if (deleteTarget.id === conversationId) {
          setConversationId(null);
          setMessages([welcomeMessage]);
        }
        refreshConversations();
      }
    } catch (error) {
      console.error("Erreur suppression conversation:", error);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  // Suggestions rapides
  const suggestions = [
    { icon: Target, text: "Créer une campagne" },
    { icon: MessageSquare, text: "Rédiger un message" },
    { icon: TrendingUp, text: "Analyser mes stats" },
  ];

  const [processingActionId, setProcessingActionId] = useState<number | null>(null);

  // --- Action management (approve / reject / retry) ---
  const updateAction = async (actionId: number, action: "approve" | "reject" | "retry" | "stop" | "continue") => {
    const numericId = Number(actionId);
    if (!numericId || isNaN(numericId)) {
      console.error("[AgentChat] Invalid actionId:", actionId);
      return;
    }
    setProcessingActionId(numericId);
    try {
      const response = await fetch("/api/linkedin-actions/approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: numericId, action }),
      });
      const data = await response.json();
      if (data.success) {
        await refreshActivity();
        if (action === "approve" || action === "retry" || action === "stop" || action === "continue") {
          startRapidPolling();
        }
      } else {
        console.error(`[AgentChat] Action ${action} failed:`, data.error);
      }
    } catch (error) {
      console.error(`[AgentChat] Error trying to ${action} action:`, error);
    } finally {
      setProcessingActionId(null);
    }
  };

  // Deduplicate: keep only linkedin_action items; remove tool_steps that duplicate them
  const actionItems = (() => {
    const linkedinActionIds = new Set(
      timeline
        .filter((t) => t.itemType === "linkedin_action")
        .map((t) => t.actionId)
    );

    // For tool_steps related to linkedin actions (linkedin_search, linkedin_send_message, etc.)
    // only keep them if no linkedin_action with the same actionId exists
    const toolStepNames = new Set([
      "linkedin_search", "linkedin_send_message", "linkedin_visit_profile",
      "linkedin_send_connection", "check_network_connections", "get_connection_results",
    ]);

    return timeline.filter((item) => {
      if (item.itemType === "tool_step" && toolStepNames.has(item.actionType)) {
        return false; // hide tool steps that correspond to real queued actions
      }
      return true;
    });
  })();

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[1fr_420px] overflow-hidden">
        <Card className="flex flex-col min-h-0 m-5 rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15),0_0_0_1px_rgba(255,255,255,0.5)_inset,0_-2px_0_0_rgba(255,255,255,0.8)_inset] overflow-hidden">
          <CardHeader className="shrink-0 border-b border-slate-200/80 bg-white px-5 h-[76px] flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#CDDFF2] flex items-center justify-center">
                  <Bot className="w-6 h-6 text-slate-800" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-1.5">
                    Agent Linkedin
                  </CardTitle>
                  <p className="text-xs text-slate-500">Conversation pilotée par OpenAI et l'extension Chrome</p>
                </div>
              </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNewConversation}
              className="text-slate-400 hover:text-rose-600 shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </CardHeader>

          <CardContent className="flex flex-1 min-h-0 flex-col p-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {isBootstrapping ? (
                <div className="flex h-full items-center justify-center text-slate-500">
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Chargement de la conversation...
                  </div>
                </div>
              ) : (
                <>
                  <AnimatePresence>
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25 }}
                        className={cn(
                          "mb-4 flex gap-3",
                          message.role === "user" ? "flex-row-reverse" : "flex-row"
                        )}
                      >
                        <div
                          className={cn(
                            "mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl shadow-sm",
                            message.role === "user"
                              ? "bg-gradient-to-br from-blue-500 to-blue-600"
                              : "bg-[#CDDFF2]"
                          )}
                        >
                          {message.role === "user" ? (
                            <User className="w-4 h-4 text-white" />
                          ) : (
                            <Bot className="w-4 h-4 text-slate-800" />
                          )}
                        </div>

                        <div className={cn("max-w-[88%]", message.role === "user" ? "items-end" : "items-start")}>
                          <div
                            className={cn(
                              "rounded-3xl px-4 py-3 text-sm shadow-sm border",
                              message.role === "user"
                                ? "bg-blue-600 text-white border-blue-600 rounded-br-lg"
                                : "bg-white text-slate-900 border-slate-200 rounded-bl-lg"
                            )}
                          >
                            {message.isLoading ? (
                              <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className={cn(message.role === "user" ? "text-white/90" : "text-slate-500")}>
                                  L'agent réfléchit et prépare les actions...
                                </span>
                              </div>
                            ) : (
                              <div className="whitespace-pre-wrap leading-6">{message.content}</div>
                            )}
                          </div>
                          <p className={cn("mt-1 px-2 text-[11px] text-slate-400", message.role === "user" ? "text-right" : "text-left")}>
                            {formatDateLabel(message.timestamp)}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  <div ref={messagesEndRef} />

                  {messages.length <= 1 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {suggestions.map((suggestion) => (
                        <button
                          key={suggestion.text}
                          onClick={() => {
                            setInput(suggestion.text);
                            inputRef.current?.focus();
                          }}
                          className="flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3.5 py-2 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                        >
                          <suggestion.icon className="w-3.5 h-3.5" />
                          {suggestion.text}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="border-t border-slate-100 bg-white px-5 py-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-2 shadow-inner">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Crée une action..."
                    className="flex-1 rounded-2xl border-0 bg-transparent px-3 py-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="h-11 rounded-2xl bg-[#CDDFF2] px-4 text-slate-800 hover:bg-[#B8D4EE] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col min-h-0 border-0 shadow-none bg-gradient-to-br from-slate-50 to-white rounded-none">
          <CardHeader className="shrink-0 border-b border-slate-200/80 px-5 h-[76px] flex flex-row items-center justify-between space-y-0 bg-white">
            <CardTitle className="text-lg font-bold text-slate-900">
              {rightPanelView === "actions" ? "Actions de l'agent" : "Historique des chats"}
            </CardTitle>

              <div className="ml-auto flex items-center gap-1">
                <Button
                  variant={rightPanelView === "actions" ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setRightPanelView("actions"); refreshActivity(); }}
                  className={cn(
                    "text-xs px-2.5",
                    rightPanelView === "actions"
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "border-slate-200 bg-white"
                  )}
                  title="Actions de l'agent"
                >
                  <ClipboardList className="w-3.5 h-3.5 mr-1" />
                  Actions
                </Button>
                <Button
                  variant={rightPanelView === "history" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRightPanelView("history")}
                  className={cn(
                    "text-xs px-2.5",
                    rightPanelView === "history"
                      ? "bg-violet-600 text-white hover:bg-violet-700"
                      : "border-slate-200 bg-white"
                  )}
                  title="Historique des chats"
                >
                  <MessageSquare className="w-3.5 h-3.5 mr-1" />
                  Chats
                </Button>
              </div>
          </CardHeader>

          <CardContent className="flex flex-1 min-h-0 flex-col p-0 overflow-hidden">
            {rightPanelView === "actions" ? (
              <>
                <div className="flex-1 overflow-y-auto px-4 py-4">
                  {isActivityLoading && actionItems.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-slate-500">
                      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Chargement des actions agent...
                      </div>
                    </div>
                  ) : actionItems.length === 0 ? (
                    <div className="flex h-full items-center justify-center">
                      <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-center">
                        <ClipboardList className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                        <p className="text-sm font-semibold text-slate-700">Aucune action agent pour le moment</p>
                        <p className="mt-1 text-xs text-slate-500">Dès que l'agent crée une campagne, recherche, connexion ou message, cela apparaîtra ici.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {actionItems.map((item) => {
                        const Icon = getActivityIcon(item.actionType);
                        const styles = getStatusStyles(item.status);
                        const isProcessing = processingActionId === item.actionId;
                        const isLinkedInAction = item.itemType === "linkedin_action";

                        return (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: 12 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={cn("rounded-2xl border bg-white p-4 shadow-sm transition-all hover:shadow-md", styles.border)}
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn("p-2.5 rounded-xl border-0 shadow-sm", getActionBadgeColor(item.status))}>
                                <Icon className="w-5 h-5" />
                              </div>

                              <div className="min-w-0 flex-1">
                                {/* Row 1: Title + Status badge — min-h matches icon height */}
                                <div className="flex min-h-10 flex-wrap items-center gap-2">
                                  <h4 className="text-sm font-semibold text-slate-900">{item.itemType === "linkedin_action" ? getActionLabel(item.actionType) : item.title}</h4>
                                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", styles.badge)}>
                                    {item.statusLabel}
                                  </span>
                                </div>

                                {/* Row 2: Action Buttons */}
                                {isLinkedInAction && (
                                  <div className="mt-2 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                    {item.status === "pending_approval" && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); updateAction(item.actionId, "approve"); }}
                                          disabled={isProcessing}
                                          className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg text-[11px] font-medium transition-colors disabled:opacity-50 cursor-pointer"
                                        >
                                          {isProcessing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                          Approuver
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); updateAction(item.actionId, "reject"); }}
                                          disabled={isProcessing}
                                          className="flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-[11px] font-medium transition-colors disabled:opacity-50 cursor-pointer"
                                        >
                                          <X className="w-3 h-3" />
                                          Rejeter
                                        </button>
                                      </>
                                    )}
                                    {(item.status === "approved" || item.status === "processing") && (
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); updateAction(item.actionId, "stop"); }}
                                        disabled={isProcessing}
                                        className="flex items-center gap-1 px-2.5 py-1 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 rounded-lg text-[11px] font-medium transition-colors disabled:opacity-50 cursor-pointer"
                                      >
                                        {isProcessing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Square className="w-3 h-3" />}
                                        Stop
                                      </button>
                                    )}
                                    {item.status === "stopped" && (
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); updateAction(item.actionId, "continue"); }}
                                        disabled={isProcessing}
                                        className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg text-[11px] font-medium transition-colors disabled:opacity-50 cursor-pointer"
                                      >
                                        {isProcessing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                                        Continuer
                                      </button>
                                    )}
                                    {(item.status === "rejected" || item.status === "failed") && (
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); updateAction(item.actionId, "retry"); }}
                                        disabled={isProcessing}
                                        className="flex items-center gap-1 px-2.5 py-1 bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-700 rounded-lg text-[11px] font-medium transition-colors disabled:opacity-50 cursor-pointer"
                                      >
                                        {isProcessing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                        Réessayer
                                      </button>
                                    )}
                                  </div>
                                )}

                                {/* Prospect list link */}
                                {item.targetUrl && (
                                  <a
                                    href={item.targetUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                  >
                                    Voir la liste des prospects
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}

                                {/* Detail block */}
                                {item.detail && (
                                  <div className="mt-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                                    <p className="text-[11px] font-medium text-slate-500 mb-1">Détail</p>
                                    {item.detail.split("\n").map((line: string, i: number) => (
                                      <p key={i} className="text-xs leading-5 text-slate-600">{line}</p>
                                    ))}
                                  </div>
                                )}

                                {/* Timestamps */}
                                <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                                  <span className="inline-flex items-center gap-1">
                                    <span className={cn("h-1.5 w-1.5 rounded-full", styles.dot)} />
                                    {formatTimeAgo(item.createdAt)}
                                  </span>
                                  {item.targetName && <span>Cible: {item.targetName}</span>}
                                  {item.executedAt && <span>Exécution: {formatDateLabel(item.executedAt)}</span>}
                                </div>

                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {conversations.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-center">
                      <History className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                      <p className="text-sm font-semibold text-slate-700">Aucune conversation</p>
                      <p className="mt-1 text-xs text-slate-500">Vos échanges avec l'agent apparaîtront ici.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {conversations.map((conv) => (
                      <motion.button
                        key={conv.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => loadConversation(conv.id)}
                        className={cn(
                          "w-full text-left rounded-2xl border p-3.5 shadow-sm transition-all hover:shadow-md cursor-pointer",
                          conv.id === conversationId
                            ? "border-blue-300 bg-blue-50/80 ring-1 ring-blue-200"
                            : "border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/30"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                            conv.id === conversationId
                              ? "bg-blue-500"
                              : "bg-gradient-to-br from-violet-500 to-blue-500"
                          )}>
                            <MessageSquare className="w-4 h-4 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-900 line-clamp-2 leading-5">
                              {conv.firstMessage}
                            </p>
                            <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-400">
                              <span>{formatDateLabel(conv.startedAt)}</span>
                              <span>•</span>
                              <span>{conv.messageCount} msg</span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => askDeleteConversation(conv.id, conv.firstMessage, e)}
                            className="shrink-0 mt-0.5 p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                            title="Supprimer cette conversation"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de confirmation de suppression */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            onClick={() => setDeleteTarget(null)}
          >
            <div className="absolute inset-0 bg-black/50" />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xs bg-white rounded-2xl shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-red-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-gray-900">Supprimer la conversation</h3>
                    <p className="text-xs text-gray-500">{deleteTarget.preview.substring(0, 30)}...</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="text-center py-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Trash2 className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium text-sm">
                    Supprimer cette conversation ?
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Cette action est irréversible. La conversation et tous ses messages seront supprimés définitivement.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex gap-2">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={isDeleting}
                  className="flex-1 py-2 text-xs text-gray-600 hover:text-gray-900 font-medium transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Suppression...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3 h-3" />
                      Supprimer
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
