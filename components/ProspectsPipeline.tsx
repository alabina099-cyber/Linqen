"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { 
  User, Building2, MapPin, Star, Plus, TrendingUp, Target, 
  Filter, MoreHorizontal, Mail, Phone, Calendar, ArrowRight,
  Sparkles, Zap, Trophy, Flame, Crown, Award, TrendingDown,
  Users, BarChart3, Clock, CheckCircle2
} from "lucide-react";

interface ProspectsPipelineProps {
  fullView?: boolean;
}

interface Prospect {
  id: string;
  name: string;
  role: string;
  company: string;
  score: number;
  location: string;
  email?: string;
  phone?: string;
  lastActivity?: string;
  avatar?: string;
  tags?: string[];
}

interface PipelineStage {
  id: string;
  status: string;
  count: number;
  prospects: Prospect[];
  conversionRate?: number;
  avgTime?: string;
  gradient: string;
  icon: any;
  description: string;
}

const pipelineData: PipelineStage[] = [
  {
    id: "identified",
    status: "Identified",
    count: 50,
    prospects: [
      { id: "1", name: "Alex D.", role: "CTO", company: "TechFlow", score: 50, location: "Paris", lastActivity: "Il y a 2h", tags: ["Tech", "Startup"], avatar: "AD" },
      { id: "2", name: "Sarah M.", role: "CEO", company: "DataCorp", score: 55, location: "Lyon", lastActivity: "Il y a 5h", tags: ["Data", "Scale-up"], avatar: "SM" },
      { id: "3", name: "Marc T.", role: "VP Sales", company: "FinTech Co", score: 48, location: "Lille", lastActivity: "Il y a 1j", tags: ["Finance"], avatar: "MT" },
    ],
    gradient: "from-slate-500 to-slate-600",
    icon: Target,
    description: "Prospects identifiés",
    conversionRate: 70,
    avgTime: "2.5j"
  },
  {
    id: "contacted",
    status: "Contacted",
    count: 35,
    prospects: [
      { id: "4", name: "Ben F.", role: "Marketing Dir.", company: "GrowthLab", score: 65, location: "Marseille", lastActivity: "Il y a 3h", tags: ["Marketing"], avatar: "BF" },
      { id: "5", name: "Clara S.", role: "Sales VP", company: "Innovate AI", score: 68, location: "Toulouse", lastActivity: "Il y a 6h", tags: ["AI", "Tech"], avatar: "CS" },
      { id: "6", name: "Julie R.", role: "COO", company: "DataScale", score: 62, location: "Bordeaux", lastActivity: "Il y a 8h", tags: ["Data"], avatar: "JR" },
    ],
    gradient: "from-blue-500 to-blue-600",
    icon: Mail,
    description: "Premier contact établi",
    conversionRate: 63,
    avgTime: "4.2j"
  },
  {
    id: "replied",
    status: "Replied",
    count: 22,
    prospects: [
      { id: "7", name: "David K.", role: "CEO", company: "CloudScale", score: 75, location: "Bordeaux", lastActivity: "Il y a 1h", tags: ["Cloud", "SaaS"], avatar: "DK" },
      { id: "8", name: "Emma L.", role: "Founder", company: "StartupX", score: 78, location: "Nantes", lastActivity: "Il y a 4h", tags: ["Startup"], avatar: "EL" },
    ],
    gradient: "from-purple-500 to-purple-600",
    icon: MessageIcon,
    description: "Réponse reçue",
    conversionRate: 68,
    avgTime: "3.8j"
  },
  {
    id: "clicked",
    status: "Clicked",
    count: 15,
    prospects: [
      { id: "9", name: "Frank H.", role: "CTO", company: "DevOps Pro", score: 85, location: "Lille", lastActivity: "Il y a 30min", tags: ["DevOps"], avatar: "FH" },
      { id: "10", name: "Grace W.", role: "VP Eng", company: "TechVision", score: 87, location: "Strasbourg", lastActivity: "Il y a 2h", tags: ["Tech"], avatar: "GW" },
    ],
    gradient: "from-cyan-500 to-cyan-600",
    icon: Zap,
    description: "Intérêt confirmé",
    conversionRate: 53,
    avgTime: "2.1j"
  },
  {
    id: "converted",
    status: "Converted",
    count: 8,
    prospects: [
      { id: "11", name: "Henry P.", role: "CEO", company: "SaaS Master", score: 95, location: "Nice", lastActivity: "Il y a 15min", tags: ["SaaS", "Enterprise"], avatar: "HP" },
      { id: "12", name: "Iris T.", role: "Founder", company: "AI Solutions", score: 98, location: "Rennes", lastActivity: "Il y a 1h", tags: ["AI"], avatar: "IT" },
    ],
    gradient: "from-green-500 to-green-600",
    icon: Trophy,
    description: "Client converti",
    conversionRate: 100,
    avgTime: "5.5j"
  },
];

function MessageIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function getScoreColor(score: number) {
  if (score >= 90) return "text-emerald-600 bg-emerald-50";
  if (score >= 75) return "text-blue-600 bg-blue-50";
  if (score >= 60) return "text-purple-600 bg-purple-50";
  if (score >= 45) return "text-amber-600 bg-amber-50";
  return "text-red-600 bg-red-50";
}

function getScoreIcon(score: number) {
  if (score >= 90) return Crown;
  if (score >= 75) return Award;
  if (score >= 60) return Star;
  if (score >= 45) return Flame;
  return TrendingDown;
}


export default function ProspectsPipeline({ fullView = false }: ProspectsPipelineProps) {
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const displayLimit = fullView ? 10 : 3;

  const totalProspects = pipelineData.reduce((acc, stage) => acc + stage.count, 0);
  const totalConverted = pipelineData[pipelineData.length - 1].count;
  const globalConversionRate = Math.round((totalConverted / totalProspects) * 100);

  return (
    <div className={fullView ? "w-full" : ""}>
      {!fullView ? (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Pipeline CRM</h2>
          </div>
          <Badge className="bg-blue-100 text-blue-700 text-xs">
            {globalConversionRate}% conversion
          </Badge>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Pipeline CRM</h1>
              <p className="text-gray-500 text-sm">Gérez vos prospects et votre pipeline de conversion</p>
            </div>
          </div>
          
          {/* Stats globales compactes */}
          <div className="grid grid-cols-4 gap-2 mt-3">
            {[
              { label: "Total", value: totalProspects, icon: Users, color: "from-blue-500 to-blue-600" },
              { label: "Convertis", value: totalConverted, icon: Trophy, color: "from-green-500 to-green-600" },
              { label: "Taux", value: `${globalConversionRate}%`, icon: TrendingUp, color: "from-purple-500 to-purple-600" },
              { label: "En cours", value: totalProspects - totalConverted, icon: Clock, color: "from-amber-500 to-amber-600" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-lg p-2 shadow-sm border border-gray-100 flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 leading-tight">{stat.value}</p>
                  <p className="text-[10px] text-gray-500">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Pipeline columns - full width */}
      <div className="flex gap-2 pb-3 w-full">
        {pipelineData.map((stage, stageIdx) => {
          const StageIcon = stage.icon;
          const isSelected = selectedStage === stage.id;
          
          return (
            <motion.div 
              key={stage.id} 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: stageIdx * 0.1 }}
              className={`flex-1 min-w-0 flex flex-col ${isSelected ? "flex-[1.5]" : ""}`}
            >
              {/* Column header avec dégradé */}
              <div 
                className={`bg-gradient-to-r ${stage.gradient} rounded-lg p-2.5 mb-1.5 shadow-md cursor-pointer hover:shadow-lg transition-shadow`}
                onClick={() => setSelectedStage(isSelected ? null : stage.id)}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
                      <StageIcon className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-white font-semibold text-sm">{stage.status}</span>
                  </div>
                  <Badge className="bg-white/30 text-white border-0 font-bold text-xs px-1.5 py-0">
                    {stage.count}
                  </Badge>
                </div>
                
                {/* Mini stats */}
                <div className="flex items-center gap-2 text-[10px] text-white/80">
                  <span className="flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" />
                    {stage.conversionRate}%
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Clock className="w-3 h-3" />
                    ~{stage.avgTime}
                  </span>
                </div>
              </div>

              {/* Cards container */}
              <div className="bg-gray-50/80 rounded-lg flex-1 p-1.5 space-y-1.5 min-h-32 border border-gray-100">
                <AnimatePresence>
                  {stage.prospects.slice(0, displayLimit).map((prospect, idx) => {
                    const ScoreIcon = getScoreIcon(prospect.score);
                    const isHovered = hoveredCard === prospect.id;
                    const scoreColor = getScoreColor(prospect.score);
                    
                    return (
                      <motion.div
                        key={prospect.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: idx * 0.05 }}
                        onMouseEnter={() => setHoveredCard(prospect.id)}
                        onMouseLeave={() => setHoveredCard(null)}
                        className={`bg-white rounded-lg p-2 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border border-gray-100 ${isHovered ? "ring-2 ring-blue-500/20 -translate-y-0.5" : ""}`}
                      >
                        {/* Header avec avatar et nom */}
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${stage.gradient} flex items-center justify-center shrink-0 text-white font-bold text-xs`}>
                            {prospect.avatar}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900 truncate">{prospect.name}</p>
                            <p className="text-[10px] text-gray-500 truncate">{prospect.role}</p>
                          </div>
                          <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full ${scoreColor}`}>
                            <ScoreIcon className="w-3 h-3" />
                            <span className="text-[10px] font-bold">{prospect.score}</span>
                          </div>
                        </div>

                        {/* Tags */}
                        {prospect.tags && (
                          <div className="flex flex-wrap gap-1 mb-1.5">
                            {prospect.tags.map((tag) => (
                              <span key={tag} className="text-[9px] px-1 py-0.5 bg-gray-100 text-gray-600 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Company & Location */}
                        <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-1">
                          <Building2 className="w-3 h-3 shrink-0 text-gray-400" />
                          <span className="truncate">{prospect.company}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-[10px] text-gray-400">
                            <MapPin className="w-3 h-3" />
                            {prospect.location}
                          </div>
                          <span className="text-[9px] text-gray-400">{prospect.lastActivity}</span>
                        </div>

                        {/* Actions rapides (visible au hover) */}
                        <AnimatePresence>
                          {isHovered && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="pt-1.5 mt-1.5 border-t border-gray-100 flex gap-1"
                            >
                              <button className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Email">
                                <Mail className="w-3 h-3" />
                              </button>
                              <button className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors" title="Téléphone">
                                <Phone className="w-3 h-3" />
                              </button>
                              <button className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors" title="RDV">
                                <Calendar className="w-3 h-3" />
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {/* Add card button */}
                <motion.button 
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full flex items-center justify-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 hover:bg-white hover:shadow-sm rounded-lg py-2 transition-all border border-dashed border-gray-300"
                  title="Ajouter un prospect"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter
                </motion.button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
