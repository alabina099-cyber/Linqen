"use client";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { useState } from "react";
import { 
  UserPlus, MessageSquare, MousePointerClick, CheckCircle, Clock, 
  Target, Send, Filter, Sparkles, TrendingUp, RefreshCw, MoreHorizontal
} from "lucide-react";

const activities = [
  { type: "conversion", icon: CheckCircle, color: "text-green-600", bgColor: "bg-green-50", badgeColor: "bg-green-100 text-green-700 border-green-200", badge: "Conversion", title: "Démo réservée", prospect: "Emma L.", role: "Founder @ StartupX", detail: "Emma a réservé un créneau de 30 min via Calendly", campaign: "CTOs Tech Paris", time: "Il y a 5 min" },
  { type: "click", icon: MousePointerClick, color: "text-cyan-600", bgColor: "bg-cyan-50", badgeColor: "bg-cyan-100 text-cyan-700 border-cyan-200", badge: "Clic", title: "Lien visité", prospect: "David K.", role: "CEO @ CloudScale", detail: "David a cliqué sur le lien de démonstration produit", campaign: "Fondateurs SaaS B2B", time: "Il y a 12 min" },
  { type: "reply", icon: MessageSquare, color: "text-purple-600", bgColor: "bg-purple-50", badgeColor: "bg-purple-100 text-purple-700 border-purple-200", badge: "Réponse", title: "Message reçu", prospect: "Sarah M.", role: "CEO @ DataCorp", detail: "\"Merci pour votre message, je reviendrai vers vous très prochainement\"", campaign: "Directeurs Marketing", time: "Il y a 23 min" },
  { type: "connection", icon: UserPlus, color: "text-blue-600", bgColor: "bg-blue-50", badgeColor: "bg-blue-100 text-blue-700 border-blue-200", badge: "Connexion", title: "Invitation acceptée", prospect: "Ben F.", role: "Marketing Dir. @ GrowthLab", detail: "Ben a accepté votre invitation LinkedIn — relance planifiée dans 3 jours", campaign: "Fondateurs SaaS B2B", time: "Il y a 1h" },
  { type: "connection", icon: UserPlus, color: "text-blue-600", bgColor: "bg-blue-50", badgeColor: "bg-blue-100 text-blue-700 border-blue-200", badge: "Connexion", title: "Invitation acceptée", prospect: "Clara S.", role: "Sales VP @ Innovate AI", detail: "Clara a accepté votre invitation LinkedIn — relance planifiée dans 3 jours", campaign: "CTOs Tech Paris", time: "Il y a 2h" },
  { type: "reply", icon: MessageSquare, color: "text-purple-600", bgColor: "bg-purple-50", badgeColor: "bg-purple-100 text-purple-700 border-purple-200", badge: "Réponse", title: "Message reçu", prospect: "Alex D.", role: "CTO @ TechFlow", detail: "\"Oui, votre solution semble intéressante, envoyez-moi plus d'infos\"", campaign: "CTOs Tech Paris", time: "Il y a 3h" },
];

const filters = ["Tous", "Réponses", "Conversions", "Connexions", "Clics"];

export default function RecentActivity() {
  const [activeFilter, setActiveFilter] = useState("Tous");

  const filteredActivities = activeFilter === "Tous" 
    ? activities 
    : activities.filter(a => {
        if (activeFilter === "Réponses") return a.type === "reply";
        if (activeFilter === "Conversions") return a.type === "conversion";
        if (activeFilter === "Connexions") return a.type === "connection";
        if (activeFilter === "Clics") return a.type === "click";
        return true;
      });

  const stats = [
    { label: "Aujourd'hui", value: activities.length, icon: Clock },
    { label: "Conversions", value: activities.filter(a => a.type === "conversion").length, icon: CheckCircle },
    { label: "Taux d'eng.", value: "24%", icon: TrendingUp },
  ];

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white pb-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Activité Récente</CardTitle>
              <p className="text-sm text-gray-500">{activities.length} événements aujourd'hui</p>
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
          <Filter className="w-4 h-4 text-gray-400 mr-1" />
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
          <Button variant="ghost" size="sm" className="ml-auto text-gray-400 hover:text-gray-600">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredActivities.map((activity, idx) => {
            const Icon = activity.icon;
            return (
              <div
                key={idx}
                className="group flex gap-3 p-4 rounded-xl border border-gray-100 bg-white hover:shadow-lg hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${activity.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-6 h-6 ${activity.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-bold text-gray-900">{activity.title}</span>
                    <Badge className={`text-xs shrink-0 ${activity.badgeColor}`}>{activity.badge}</Badge>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">{activity.prospect}</p>
                  <p className="text-xs text-gray-500">{activity.role}</p>
                  <p className="text-xs text-gray-600 mt-2 leading-relaxed line-clamp-2 bg-gray-50 rounded-lg p-2">{activity.detail}</p>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Target className="w-3 h-3" />
                      {activity.campaign}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      {activity.time}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
