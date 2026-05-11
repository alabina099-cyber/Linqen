"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Loader2, 
  Trash2,
  Target,
  MessageSquare,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Link2,
  Search,
  UserRound,
  RefreshCw,
  Rocket,
  Megaphone,
  History,
  Zap,
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
  if (actionType === "visit_profile" || actionType === "linkedin_visit_profile") return UserRound;
  if (actionType === "send_connection" || actionType === "linkedin_send_connection") return Link2;
  if (actionType === "send_message" || actionType === "linkedin_send_message") return MessageSquare;
  if (actionType === "scheduled_followup" || actionType === "schedule_followup") return Clock;
  if (actionType === "create_campaign" || actionType === "update_campaign") return Megaphone;
  if (actionType === "analyze_prospect" || actionType === "generate_message" || actionType === "suggest_strategy") return Zap;
  if (actionType === "save_prospect" || actionType === "search_prospects_db") return UserRound;
  if (actionType === "check_network_connections") return Link2;
  if (actionType === "get_campaign_stats" || actionType === "get_rate_limits") return TrendingUp;
  return Sparkles;
}

function getStatusStyles(status: string) {
  if (status === "pending_approval") {
    return {
      badge: "bg-amber-50 text-amber-700 border-amber-200",
      dot: "bg-amber-400",
      border: "border-amber-200/80",
      panel: "bg-amber-50/70",
      icon: Clock,
    };
  }

  if (status === "approved") {
    return {
      badge: "bg-blue-50 text-blue-700 border-blue-200",
      dot: "bg-blue-400",
      border: "border-blue-200/80",
      panel: "bg-blue-50/70",
      icon: RefreshCw,
    };
  }

  if (status === "processing") {
    return {
      badge: "bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse",
      dot: "bg-indigo-500 animate-pulse",
      border: "border-indigo-200/80",
      panel: "bg-indigo-50/70",
      icon: RefreshCw,
    };
  }

  if (status === "completed" || status === "sent") {
    return {
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dot: "bg-emerald-400",
      border: "border-emerald-200/80",
      panel: "bg-emerald-50/70",
      icon: CheckCircle2,
    };
  }

  if (status === "stopped") {
    return {
      badge: "bg-orange-50 text-orange-700 border-orange-200",
      dot: "bg-orange-400",
      border: "border-orange-200/80",
      panel: "bg-orange-50/70",
      icon: Square,
    };
  }

  if (status === "failed" || status === "rejected" || status === "cancelled") {
    return {
      badge: "bg-rose-50 text-rose-700 border-rose-200",
      dot: "bg-rose-400",
      border: "border-rose-200/80",
      panel: "bg-rose-50/70",
      icon: AlertTriangle,
    };
  }

  if (status === "draft") {
    return {
      badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
      dot: "bg-indigo-400",
      border: "border-indigo-200/80",
      panel: "bg-indigo-50/70",
      icon: Megaphone,
    };
  }

  if (status === "active") {
    return {
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dot: "bg-emerald-400",
      border: "border-emerald-200/80",
      panel: "bg-emerald-50/70",
      icon: CheckCircle2,
    };
  }

  if (status === "paused") {
    return {
      badge: "bg-amber-50 text-amber-700 border-amber-200",
      dot: "bg-amber-400",
      border: "border-amber-200/80",
      panel: "bg-amber-50/70",
      icon: Clock,
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
    <div className="h-full flex flex-col min-h-0">
      <div className="flex-1 min-h-0 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.55fr)_420px]">
        <Card className="flex flex-col min-h-0 border-0 shadow-xl bg-gradient-to-b from-white to-slate-50/70">
          <CardHeader className="shrink-0 border-b border-slate-100 bg-white/95 backdrop-blur-sm pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-1.5">
                    Agent Linkedin
                  </CardTitle>
                  <p className="text-xs text-slate-500">Conversation pilotée par OpenAI et l'extension Chrome</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNewConversation}
                  className="text-slate-400 hover:text-rose-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
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
                              : "bg-gradient-to-br from-violet-500 to-fuchsia-600"
                          )}
                        >
                          {message.role === "user" ? (
                            <User className="w-4 h-4 text-white" />
                          ) : (
                            <Bot className="w-4 h-4 text-white" />
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
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-2 shadow-inner">
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
                    placeholder="Ex: crée une campagne pour des CEOs SaaS à Paris et prépare les actions LinkedIn"
                    className="flex-1 rounded-2xl border-0 bg-transparent px-3 py-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="h-11 rounded-2xl bg-gradient-to-r from-blue-500 to-violet-600 px-4 shadow-lg shadow-blue-500/20 hover:from-blue-600 hover:to-violet-700"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col min-h-0 border-0 shadow-xl bg-white">
          <CardHeader className="shrink-0 border-b border-slate-100 pb-4 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-lg font-bold text-slate-900">
                  {rightPanelView === "actions" ? "Actions de l'agent" : "Historique des chats"}
                </CardTitle>
              </div>

              <div className="flex items-center gap-1">
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
                              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", styles.panel, styles.border)}>
                                <Icon className="w-5 h-5 text-slate-700" />
                              </div>

                              <div className="min-w-0 flex-1">
                                {/* Row 1: Title + Status badge — min-h matches icon height */}
                                <div className="flex min-h-10 flex-wrap items-center gap-2">
                                  <h4 className="text-sm font-semibold text-slate-900">{item.title}</h4>
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.35 }}
              className="mx-4 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
                  <Trash2 className="h-5 w-5 text-rose-600" />
                </div>

                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  Supprimer cette conversation ?
                </h3>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                  Cette action est irr&eacute;versible. La conversation et tous ses messages seront supprim&eacute;s d&eacute;finitivement.
                </p>

                <div className="mt-2 w-full rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                  <p className="text-xs text-slate-600 italic line-clamp-2">
                    &laquo; {deleteTarget.preview} &raquo;
                  </p>
                </div>

                <div className="mt-5 flex w-full gap-3">
                  <button
                    onClick={() => setDeleteTarget(null)}
                    disabled={isDeleting}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={isDeleting}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Supprimer
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
