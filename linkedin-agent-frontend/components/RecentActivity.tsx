"use client";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";
import { 
  UserPlus, MessageSquare, MousePointerClick, CheckCircle, Clock, 
  Target, Filter, Activity, TrendingUp
} from "lucide-react";

interface Message {
  id: number;
  type: string;
  recipient_name: string;
  recipient_role: string;
  recipient_company: string;
  message_text: string;
  status: string;
  campaign_name: string;
  created_at: string;
}

const filters = ["Tous", "Réponses", "Conversions", "Connexions"];

const statusConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string; badgeColor: string; badge: string; title: string }> = {
  replied: { icon: MessageSquare, color: "text-purple-600", bgColor: "bg-purple-50", badgeColor: "bg-purple-100 text-purple-700 border-purple-200", badge: "Réponse", title: "Message reçu" },
  converted: { icon: CheckCircle, color: "text-green-600", bgColor: "bg-green-50", badgeColor: "bg-green-100 text-green-700 border-green-200", badge: "Conversion", title: "Conversion" },
  sent: { icon: UserPlus, color: "text-blue-600", bgColor: "bg-blue-50", badgeColor: "bg-blue-100 text-blue-700 border-blue-200", badge: "Connexion", title: "Message envoyé" },
  pending: { icon: Clock, color: "text-gray-600", bgColor: "bg-gray-50", badgeColor: "bg-gray-100 text-gray-700 border-gray-200", badge: "En attente", title: "En attente" },
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return "Il y a quelques minutes";
  if (diffInHours < 24) return `Il y a ${diffInHours}h`;
  return `Il y a ${Math.floor(diffInHours / 24)}j`;
}

export default function RecentActivity() {
  const [activeFilter, setActiveFilter] = useState("Tous");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMessages() {
      try {
        const response = await fetch('/api/messages?limit=12');
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

  const getMessageConfig = (status: string) => {
    return statusConfig[status] || statusConfig.pending;
  };

  const filteredMessages = activeFilter === "Tous" 
    ? messages 
    : messages.filter(m => {
        if (activeFilter === "Réponses") return m.status === 'replied';
        if (activeFilter === "Conversions") return m.status === 'converted';
        if (activeFilter === "Connexions") return m.status === 'sent';
        return true;
      });

  const stats = [
    { label: "Aujourd'hui", value: messages.length, icon: Clock },
    { label: "Conversions", value: messages.filter(m => m.status === 'converted').length, icon: CheckCircle },
    { label: "Réponses", value: messages.filter(m => m.status === 'replied').length, icon: MessageSquare },
  ];

  if (loading) {
    return (
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white pb-4">
          <div className="h-8 bg-gray-200 rounded animate-pulse w-48" />
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white pb-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Activité Récente</CardTitle>
              <p className="text-sm text-gray-500">{filteredMessages.length} événements</p>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="flex gap-3">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-gray-200 shadow-sm">
                <stat.icon className="w-4 h-4 text-blue-500" />
                <div>
                  <p className="text-lg font-bold text-gray-900 leading-none">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-300 ${
                activeFilter === f
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMessages.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Aucune activité récente</p>
            </div>
          ) : (
            filteredMessages.map((message) => {
              const config = getMessageConfig(message.status);
              const Icon = config.icon;
              return (
                <div
                  key={message.id}
                  className="group flex gap-3 p-4 rounded-xl border border-gray-100 bg-white hover:shadow-lg hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${config.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`w-6 h-6 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-bold text-gray-900">{config.title}</span>
                      <Badge className={`text-xs shrink-0 ${config.badgeColor}`}>{config.badge}</Badge>
                    </div>
                    <p className="text-sm font-semibold text-gray-800">{message.recipient_name}</p>
                    <p className="text-xs text-gray-500">{message.recipient_role} @ {message.recipient_company}</p>
                    <p className="text-xs text-gray-600 mt-2 leading-relaxed line-clamp-2 bg-gray-50 rounded-lg p-2">{message.message_text}</p>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Target className="w-3 h-3" />
                        {message.campaign_name || 'Sans campagne'}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(message.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
