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
  PanelRightOpen,
  Search,
  UserRound,
  RefreshCw,
  Rocket,
  Megaphone,
  History,
  Zap,
  ChevronRight
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
    "Bonjour ! Je pilote votre prospection LinkedIn avec l'IA, le backend du projet et l'extension Chrome.\n\nJe peux préparer des recherches, créer des actions LinkedIn, planifier des relances et vous expliquer exactement ce qui est en attente, approuvé, exécuté ou bloqué.\n\nDites-moi votre objectif et je m'occupe du reste.",
  timestamp: new Date().toISOString(),
};

function formatDateLabel(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Date inconnue";
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
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
  if (actionType === "visit_profile" || actionType === "linkedin_visit_profile") return UserRound;
  if (actionType === "send_connection" || actionType === "linkedin_send_connection") return Link2;
  if (actionType === "send_message" || actionType === "linkedin_send_message") return MessageSquare;
  if (actionType === "scheduled_followup" || actionType === "schedule_followup") return Clock;
  if (actionType === "create_campaign" || actionType === "update_campaign") return Megaphone;
  if (actionType === "analyze_prospect" || actionType === "generate_message" || actionType === "suggest_strategy") return Zap;
  if (actionType === "save_prospect" || actionType === "search_prospects_db") return UserRound;
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

  if (status === "approved" || status === "processing") {
    return {
      badge: "bg-blue-50 text-blue-700 border-blue-200",
      dot: "bg-blue-400",
      border: "border-blue-200/80",
      panel: "bg-blue-50/70",
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
    }, 8000);

    return () => window.clearInterval(interval);
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

  // Suggestions rapides
  const suggestions = [
    { icon: Target, text: "Créer une campagne" },
    { icon: MessageSquare, text: "Rédiger un message" },
    { icon: TrendingUp, text: "Analyser mes stats" },
  ];

  const actionItems = timeline;

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
                    Agent LinkedIn
                    <Sparkles className="w-4 h-4 text-amber-500" />
                  </CardTitle>
                  <p className="text-xs text-slate-500">Conversation pilotée par OpenAI, LangChain, le backend et l'extension Chrome</p>
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

          <CardContent className="flex flex-col p-0 overflow-hidden" style={{ height: 'calc(100vh - 280px)' }}>
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
                  <Rocket className="w-3.5 h-3.5 mr-1" />
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
                  <History className="w-3.5 h-3.5 mr-1" />
                  Chats
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col p-0 overflow-hidden" style={{ height: 'calc(100vh - 280px)' }}>
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
                        <Rocket className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                        <p className="text-sm font-semibold text-slate-700">Aucune action agent pour le moment</p>
                        <p className="mt-1 text-xs text-slate-500">Dès que l'agent crée une campagne, recherche, connexion ou message, cela apparaîtra ici.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {actionItems.map((item) => {
                        const Icon = getActivityIcon(item.actionType);
                        const styles = getStatusStyles(item.status);

                        return (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: 12 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={cn("rounded-3xl border bg-white p-4 shadow-sm transition-all hover:shadow-md", styles.border)}
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn("mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border", styles.panel, styles.border)}>
                                <Icon className="w-5 h-5 text-slate-700" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="text-sm font-semibold text-slate-900">{item.title}</h4>
                                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", styles.badge)}>
                                    {item.statusLabel}
                                  </span>
                                </div>

                                <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>

                                <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                                  <p className="text-xs font-medium text-slate-700">Détail</p>
                                  <p className="mt-1 text-xs leading-5 text-slate-600">{item.detail}</p>
                                </div>

                                <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                                  <span className="inline-flex items-center gap-1">
                                    <span className={cn("h-2 w-2 rounded-full", styles.dot)} />
                                    {formatTimeAgo(item.createdAt)}
                                  </span>
                                  {item.targetName && <span>Cible: {item.targetName}</span>}
                                  {item.executedAt && <span>Exécution: {formatDateLabel(item.executedAt)}</span>}
                                </div>

                                {item.errorMessage && (
                                  <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs font-medium text-rose-700">
                                    {item.errorMessage}
                                  </div>
                                )}
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
                          <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-1" />
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
    </div>
  );
}
