"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Search, Send, Plus, Copy, Edit2, Trash2, CheckCircle, Clock, 
  MessageSquare, Sparkles, Zap, TrendingUp, MoreVertical, Phone, 
  Video, Info, CheckCheck, ArrowLeft
} from "lucide-react";

const conversations = [
  {
    id: 1,
    name: "Emma L.",
    role: "Founder @ StartupX",
    lastMessage: "Oui ça m'intéresse, on peut en discuter ?",
    time: "5 min",
    status: "replied",
    unread: true,
    avatar: "EL",
    online: true,
    responseRate: 95,
  },
  {
    id: 2,
    name: "David K.",
    role: "CEO @ CloudScale",
    lastMessage: "J'ai regardé votre site, très intéressant !",
    time: "23 min",
    status: "clicked",
    unread: true,
    avatar: "DK",
    online: false,
    responseRate: 88,
  },
  {
    id: 3,
    name: "Sarah M.",
    role: "CEO @ DataCorp",
    lastMessage: "Merci pour votre message, je reviendrai vers vous.",
    time: "1h",
    status: "replied",
    unread: false,
    avatar: "SM",
    online: true,
    responseRate: 72,
  },
  {
    id: 4,
    name: "Ben F.",
    role: "Marketing Dir. @ GrowthLab",
    lastMessage: "Message envoyé : Bonjour Ben, j'ai vu votre profil...",
    time: "3h",
    status: "sent",
    unread: false,
    avatar: "BF",
    online: false,
    responseRate: 45,
  },
  {
    id: 5,
    name: "Clara S.",
    role: "Sales VP @ Innovate AI",
    lastMessage: "Message envoyé : Bonjour Clara, suite à nos échanges...",
    time: "5h",
    status: "sent",
    unread: false,
    avatar: "CS",
    online: true,
    responseRate: 91,
  },
];

const messageThreads: Record<number, { from: "me" | "them"; text: string; time: string; read?: boolean }[]> = {
  1: [
    { from: "me", text: "Bonjour Emma, j'ai vu votre profil et votre travail chez StartupX m'a vraiment impressionné. Je développe un outil qui pourrait vous aider à scaler votre prospection LinkedIn. Seriez-vous disponible pour un échange rapide ?", time: "Hier 14:30" },
    { from: "them", text: "Bonjour ! Merci pour votre message. De quoi s'agit-il exactement ?", time: "Hier 16:45" },
    { from: "me", text: "En résumé, c'est un agent IA qui automatise votre prospection LinkedIn : identification de prospects, messages personnalisés, et suivi automatique. Je vous envoie un lien pour en savoir plus.", time: "Hier 17:00" },
    { from: "them", text: "Oui ça m'intéresse, on peut en discuter ?", time: "Il y a 5 min" },
  ],
  2: [
    { from: "me", text: "Bonjour David, votre parcours chez CloudScale est impressionnant. Je travaille sur un outil IA pour LinkedIn qui pourrait vous aider. Curieux d'en savoir plus ?", time: "Hier 10:00" },
    { from: "them", text: "J'ai regardé votre site, très intéressant !", time: "Il y a 23 min" },
  ],
  3: [
    { from: "me", text: "Bonjour Sarah, j'ai remarqué que DataCorp est en forte croissance. Notre agent LinkedIn pourrait accélérer votre acquisition. Intéressée ?", time: "Il y a 2j" },
    { from: "them", text: "Merci pour votre message, je reviendrai vers vous.", time: "Il y a 1h" },
  ],
  4: [
    { from: "me", text: "Bonjour Ben, j'ai vu votre profil et je pense que notre solution pourrait compléter votre stack marketing. Je vous propose un call de 15 min ?", time: "Il y a 3h" },
  ],
  5: [
    { from: "me", text: "Bonjour Clara, suite à nos échanges précédents, je voulais vous partager les résultats de nos clients en B2B SaaS. Toujours intéressée ?", time: "Il y a 5h" },
  ],
};

const templates = [
  {
    id: 1,
    name: "Premier contact",
    tag: "Invitation",
    text: "Bonjour {{prénom}}, j'ai remarqué votre profil et votre travail chez {{entreprise}} m'a vraiment impressionné. Je développe {{pitch_court}}. Seriez-vous disponible pour un échange rapide ?",
    usageCount: 142,
    conversionRate: 24,
  },
  {
    id: 2,
    name: "Message de suivi",
    tag: "Follow-up",
    text: "Bonjour {{prénom}}, je voulais faire suite à mon invitation. Je travaille sur {{solution}} et je pense que ça pourrait vraiment vous aider à {{bénéfice}}. 15 minutes cette semaine ?",
    usageCount: 89,
    conversionRate: 18,
  },
  {
    id: 3,
    name: "Partage de lien",
    tag: "Nurturing",
    text: "Bonjour {{prénom}}, suite à notre échange, je vous partage ce lien qui explique comment {{entreprise}} similaires ont obtenu {{résultat}}. Curieux d'avoir votre avis !",
    usageCount: 56,
    conversionRate: 31,
  },
  {
    id: 4,
    name: "Relance finale",
    tag: "Relance",
    text: "Bonjour {{prénom}}, je ne voudrais pas vous déranger davantage. Juste pour vous laisser ce lien au cas où : {{lien}}. N'hésitez pas si le timing change !",
    usageCount: 34,
    conversionRate: 12,
  },
];

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
};

const avatarColors = [
  "from-blue-500 to-blue-600",
  "from-purple-500 to-purple-600",
  "from-pink-500 to-pink-600",
  "from-orange-500 to-orange-600",
  "from-green-500 to-green-600",
];

export default function Messages() {
  const [activeConv, setActiveConv] = useState<number>(1);
  const [tab, setTab] = useState<"inbox" | "templates">("inbox");
  const [newMessage, setNewMessage] = useState("");
  const [search, setSearch] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const filtered = conversations.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.role.toLowerCase().includes(search.toLowerCase())
  );

  const currentConv = conversations.find((c) => c.id === activeConv);
  const thread = messageThreads[activeConv] || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread, isTyping]);

  useEffect(() => {
    // Simulate typing indicator when new message arrives
    const lastMessage = thread[thread.length - 1];
    if (lastMessage?.from === "them" && !lastMessage.read) {
      setIsTyping(true);
      const timer = setTimeout(() => setIsTyping(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [thread]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    setNewMessage("");
  };

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
              <span className="text-sm font-medium text-gray-700">{conversations.filter(c => c.online).length} en ligne</span>
            </div>
          </Card>
          <Card className="px-4 py-2 border-orange-100 bg-orange-50/50">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium text-gray-700">{conversations.filter(c => c.unread).length} nouveaux</span>
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
            <Zap className="w-4 h-4" />
            Templates IA
          </span>
        </button>
      </div>

      {tab === "inbox" && (
        <div className="flex gap-4 h-[600px]">
          {/* Conversation list - Redesigned */}
          <Card className="w-96 flex flex-col border-0 shadow-lg overflow-hidden">
            <CardHeader className="pb-4 border-b bg-gradient-to-r from-gray-50 to-white">
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
            <CardContent className="flex-1 overflow-y-auto p-0 bg-gray-50/50">
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
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Templates", value: templates.length, icon: Zap, color: "blue" },
              { label: "Utilisations", value: templates.reduce((a, b) => a + b.usageCount, 0), icon: CheckCircle, color: "green" },
              { label: "Taux moyen", value: "21%", icon: TrendingUp, color: "orange" },
              { label: "IA générée", value: "100%", icon: Sparkles, color: "purple" },
            ].map((stat) => (
              <Card key={stat.label} className={`border-${stat.color}-100 bg-${stat.color}-50/30`}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 bg-${stat.color}-100 rounded-xl flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Templates */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">{templates.length} templates disponibles</p>
            <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-600/20">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau template IA
            </Button>
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
                            {tpl.conversionRate}% conv.
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
                      Utilisé {tpl.usageCount} fois
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
