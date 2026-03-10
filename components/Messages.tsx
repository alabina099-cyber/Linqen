"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Search, Send, Plus, Copy, Edit2, Trash2, CheckCircle, Clock, 
  MessageSquare, Sparkles, Zap, TrendingUp, MoreVertical, Phone, 
  Video, Info, CheckCheck, ArrowLeft, Bell, FileText, Layout
} from "lucide-react";

interface Message {
  id: number;
  prospect_id?: number;
  campaign_id?: number;
  recipient_name: string;
  recipient_role: string;
  recipient_company: string;
  message_text: string;
  message_type: string;
  status: string;
  created_at: string;
}

interface Conversation {
  id: number;
  name: string;
  role: string;
  company: string;
  lastMessage: string;
  time: string;
  status: string;
  unread: boolean;
  avatar: string;
  online: boolean;
}

interface Template {
  id: number;
  name: string;
  tag: string;
  text: string;
  usage_count: number;
  conversion_rate: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode; bg: string }> = {
  replied: { 
    label: "Répondu", 
    color: "text-green-700", 
    icon: <CheckCircle className="w-3 h-3" />,
    bg: "bg-green-100 border-green-200"
  },
  clicked: { 
    label: "A cliqué", 
    color: "text-cyan-700", 
    icon: <TrendingUp className="w-3 h-3" />,
    bg: "bg-cyan-100 border-cyan-200"
  },
  sent: { 
    label: "Envoyé", 
    color: "text-gray-700", 
    icon: <Clock className="w-3 h-3" />,
    bg: "bg-gray-100 border-gray-200"
  },
  pending: { 
    label: "En attente", 
    color: "text-amber-700", 
    icon: <Clock className="w-3 h-3" />,
    bg: "bg-amber-100 border-amber-200"
  },
  delivered: { 
    label: "Livré", 
    color: "text-blue-700", 
    icon: <CheckCircle className="w-3 h-3" />,
    bg: "bg-blue-100 border-blue-200"
  },
  read: { 
    label: "Lu", 
    color: "text-purple-700", 
    icon: <CheckCheck className="w-3 h-3" />,
    bg: "bg-purple-100 border-purple-200"
  },
  converted: { 
    label: "Converti", 
    color: "text-emerald-700", 
    icon: <CheckCircle className="w-3 h-3" />,
    bg: "bg-emerald-100 border-emerald-200"
  },
};

const avatarColors = [
  "from-blue-500 to-blue-600",
  "from-purple-500 to-purple-600",
  "from-pink-500 to-pink-600",
  "from-orange-500 to-orange-600",
  "from-green-500 to-green-600",
];

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return "À l'instant";
  if (diffInHours < 24) return `Il y a ${diffInHours}h`;
  return `Il y a ${Math.floor(diffInHours / 24)}j`;
}

export default function Messages() {
  const [activeConv, setActiveConv] = useState<number | null>(null);
  const [tab, setTab] = useState<"inbox" | "templates">("inbox");
  const [newMessage, setNewMessage] = useState("");
  const [search, setSearch] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateStats, setTemplateStats] = useState({ total: 0, total_usage: 0, avg_conversion: 0 });
  const [notificationStats, setNotificationStats] = useState({ online: 0, newReplies: 0 });
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch messages from API
  useEffect(() => {
    async function fetchMessages() {
      try {
        const response = await fetch('/api/messages?limit=50');
        const data = await response.json();
        if (data.success) {
          setMessages(data.messages);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchMessages();
  }, []);

  // Fetch templates from API
  useEffect(() => {
    async function fetchTemplates() {
      try {
        const response = await fetch('/api/templates');
        const data = await response.json();
        if (data.success) {
          setTemplates(data.templates);
          setTemplateStats(data.stats);
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
      }
    }

    fetchTemplates();
  }, []);

  // Fetch notification stats
  useEffect(() => {
    async function fetchNotifications() {
      try {
        const response = await fetch('/api/notifications');
        const data = await response.json();
        if (data.success) {
          setNotificationStats({ online: data.online, newReplies: data.newReplies });
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    }

    fetchNotifications();
    // Refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Group messages by recipient to create conversations
  const conversations: Conversation[] = Object.values(
    messages.reduce((acc, msg) => {
      const key = msg.recipient_name;
      if (!acc[key]) {
        acc[key] = {
          id: msg.id,
          name: msg.recipient_name,
          role: msg.recipient_role,
          company: msg.recipient_company,
          lastMessage: msg.message_text,
          time: formatTimeAgo(msg.created_at),
          status: msg.status,
          unread: ['replied', 'clicked', 'converted'].includes(msg.status),
          avatar: msg.recipient_name.split(' ').map(n => n[0]).join('').toUpperCase(),
          online: false,
        };
      }
      return acc;
    }, {} as Record<string, Conversation>)
  );

  const filtered = conversations.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.role.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase())
  );

  const currentConv = activeConv ? conversations.find((c) => c.id === activeConv) : null;
  
  // Get thread messages for current conversation
  const thread = currentConv 
    ? messages
        .filter(m => m.recipient_name === currentConv.name)
        .map(m => ({
          from: m.message_type === 'response' ? "them" : "me" as "me" | "them",
          text: m.message_text,
          time: formatTimeAgo(m.created_at),
          read: m.status !== 'pending'
        }))
    : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread, isTyping]);

  useEffect(() => {
    const lastMessage = thread[thread.length - 1];
    if (lastMessage?.from === "them" && !lastMessage.read) {
      setIsTyping(true);
      const timer = setTimeout(() => setIsTyping(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [thread]);

  const handleSend = async () => {
    if (!newMessage.trim() || !currentConv) return;
    
    // TODO: Implement API call to send message
    setNewMessage("");
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-8 h-8 text-blue-600" />
              Messages
            </h1>
            <p className="text-gray-600 mt-1">Chargement...</p>
          </div>
        </div>
        <div className="flex flex-col lg:flex-row gap-4 h-auto lg:h-[600px]">
          <Card className="w-full lg:w-96 flex flex-col border-0 shadow-lg overflow-hidden">
            <CardContent className="flex-1 p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </CardContent>
          </Card>
          <Card className="flex-1 flex flex-col border-0 shadow-xl overflow-hidden">
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-8 h-8 text-blue-600" />
            Messages
          </h1>
          <p className="text-gray-600 mt-1">Conversations et templates de prospection</p>
        </div>
        <div className="flex gap-3">
          <Card className="px-4 py-2 border-blue-100 bg-blue-50/50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-gray-700">{notificationStats.online} en ligne</span>
            </div>
          </Card>
          <Card className="px-4 py-2 border-orange-100 bg-orange-50/50">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium text-gray-700">{notificationStats.newReplies} nouveaux</span>
            </div>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab("inbox")}
          className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ${
            tab === "inbox" 
              ? "bg-white text-blue-600 shadow-sm" 
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <span className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Boîte de réception
            {conversations.filter(c => c.unread).length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {conversations.filter(c => c.unread).length}
              </span>
            )}
          </span>
        </button>
        <button
          onClick={() => setTab("templates")}
          className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ${
            tab === "templates" 
              ? "bg-white text-blue-600 shadow-sm" 
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <span className="flex items-center gap-2">
            <Layout className="w-4 h-4" />
            Templates IA
          </span>
        </button>
      </div>

      {tab === "inbox" && (
        <div className="flex flex-col lg:flex-row gap-4 h-auto lg:h-[600px]">
          {/* Conversation list - Redesigned */}
          <Card className="w-full lg:w-96 flex flex-col border-0 shadow-lg overflow-hidden">
            <CardHeader className="pb-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher une conversation..."
                  className="w-full pl-10 pr-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0 bg-gray-50/50 max-h-[300px] lg:max-h-none">
              {filtered.map((conv, idx) => (
                <div
                  key={conv.id}
                  onClick={() => setActiveConv(conv.id)}
                  className={`group flex items-start gap-3 p-4 cursor-pointer transition-all duration-300 border-b border-gray-100 ${
                    activeConv === conv.id
                      ? "bg-white border-l-4 border-l-blue-600 shadow-sm"
                      : "hover:bg-white hover:shadow-sm"
                  }`}
                >
                  {/* Avatar with online indicator */}
                  <div className="relative shrink-0">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${avatarColors[idx % avatarColors.length]} flex items-center justify-center text-white text-sm font-bold shadow-md group-hover:scale-105 transition-transform`}>
                      {conv.avatar}
                    </div>
                    {conv.online && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full animate-pulse" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`font-semibold truncate ${conv.unread ? "text-gray-900" : "text-gray-700"}`}>
                        {conv.name}
                      </span>
                      <span className="text-xs text-gray-400 shrink-0">{conv.time}</span>
                    </div>
                    
                    <p className="text-xs text-gray-500 mb-1">{conv.role}</p>
                    
                    <div className="flex items-center justify-between">
                      <p className={`text-xs truncate pr-2 ${conv.unread ? "text-gray-800 font-medium" : "text-gray-500"}`}>
                        {conv.lastMessage}
                      </p>
                      {conv.unread && (
                        <span className="w-2.5 h-2.5 bg-blue-600 rounded-full shrink-0 animate-pulse" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Conversation thread - Redesigned */}
          <Card className="flex-1 flex flex-col border-0 shadow-xl overflow-hidden bg-gradient-to-b from-white to-gray-50/30">
            {currentConv ? (
              <>
                {/* Header */}
                <CardHeader className="border-b pb-4 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-lg font-bold shadow-lg">
                          {currentConv.avatar}
                        </div>
                        {currentConv.online && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full animate-pulse" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-lg">{currentConv.name}</p>
                        <p className="text-sm text-gray-500">{currentConv.role}</p>
                        {currentConv.online && (
                          <p className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                            En ligne
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Badge className={`${statusConfig[currentConv.status]?.bg} ${statusConfig[currentConv.status]?.color} border px-3 py-1 flex items-center gap-1.5`}>
                        {statusConfig[currentConv.status]?.icon}
                        {statusConfig[currentConv.status]?.label}
                      </Badge>
                      <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600">
                        <MoreVertical className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {/* Messages */}
                <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
                  {thread.map((msg, idx) => (
                    <div 
                      key={idx} 
                      className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}
                    >
                      {msg.from === "them" && (
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold mr-2 mt-1 shrink-0">
                          {currentConv.avatar}
                        </div>
                      )}
                      
                      <div className={`max-w-[75%] ${msg.from === "me" ? "order-1" : ""}`}>
                        <div 
                          className={`rounded-2xl px-5 py-3 shadow-sm ${
                            msg.from === "me" 
                              ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-br-md" 
                              : "bg-white text-gray-800 border border-gray-200 rounded-bl-md"
                          }`}
                        >
                          <p className="text-sm leading-relaxed">{msg.text}</p>
                        </div>
                        <div className={`flex items-center gap-1 mt-1.5 ${msg.from === "me" ? "justify-end" : ""}`}>
                          <span className={`text-xs ${msg.from === "me" ? "text-gray-400" : "text-gray-400"}`}>
                            {msg.time}
                          </span>
                          {msg.from === "me" && (
                            <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Typing indicator */}
                  {isTyping && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                        {currentConv.avatar}
                      </div>
                      <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </CardContent>

                {/* Input */}
                <div className="border-t bg-white p-4">
                  <div className="flex gap-3 items-end">
                    <div className="flex-1 relative">
                      <input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
                        placeholder="Écrivez votre message..."
                        className="w-full px-4 py-3 pr-12 text-sm bg-gray-100 border-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none"
                      />
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600"
                      >
                        <Sparkles className="w-4 h-4" />
                      </Button>
                    </div>
                    <Button
                      onClick={handleSend}
                      disabled={!newMessage.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:shadow-none transition-all hover:scale-105"
                    >
                      <Send className="w-5 h-5" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    Appuyez sur Entrée pour envoyer, Maj+Entrée pour nouvelle ligne
                  </p>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-400 bg-gradient-to-b from-white to-gray-50">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl flex items-center justify-center">
                  <MessageSquare className="w-12 h-12 text-blue-400" />
                </div>
                <p className="text-lg font-medium text-gray-600">Sélectionnez une conversation</p>
                <p className="text-sm text-gray-400">Choisissez un contact pour voir les messages</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === "templates" && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Templates", value: templates.length, icon: FileText, color: "blue" },
              { label: "Utilisations", value: templateStats.total_usage, icon: CheckCircle, color: "green" },
              { label: "Taux moyen", value: `${Math.round(templateStats.avg_conversion || 0)}%`, icon: TrendingUp, color: "orange" },
              { label: "IA générée", value: "100%", icon: Sparkles, color: "purple" },
            ].map((stat) => (
              <Card key={stat.label} className={`border-0 bg-${stat.color}-50/30`}>
                <CardContent className="p-3 flex items-center gap-2">
                  <div className={`w-8 h-8 bg-${stat.color}-100 rounded-lg flex items-center justify-center`}>
                    <stat.icon className={`w-4 h-4 text-${stat.color}-600`} />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Templates */}
          <div className="flex justify-end mb-4">
            <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-600/20">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau template IA
            </Button>
          </div>

          <div className="flex justify-between items-center">
            {templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center flex-1">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 text-lg">Aucun template trouvé</p>
              </div>
            ) : (
              <p className="text-sm text-gray-600">{templates.length} templates disponibles</p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {templates.map((tpl, idx) => (
              <Card key={tpl.id} className="hover:shadow-xl transition-all duration-300 border-0 shadow-md group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatarColors[idx % avatarColors.length]} flex items-center justify-center text-white font-bold text-sm`}>
                        {tpl.id}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{tpl.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className="bg-blue-100 text-blue-700 text-xs">{tpl.tag}</Badge>
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            {tpl.conversion_rate}% conv.
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button aria-label="Copier" className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Copy className="w-4 h-4" />
                      </button>
                      <button aria-label="Modifier" className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button aria-label="Supprimer" className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-xl p-4 mb-3">
                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">{tpl.text}</p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Utilisé {tpl.usage_count} fois
                    </div>
                    <Button variant="outline" size="sm" className="text-xs">
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      Améliorer avec l'IA
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
