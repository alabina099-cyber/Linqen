"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { 
  User, Building2, MapPin, Star, Plus, TrendingUp, Target, 
  Filter, MoreHorizontal, Mail, Phone, Calendar, ArrowRight,
  Sparkles, Zap, Trophy, Flame, Crown, Award, TrendingDown,
  Users, BarChart3, Clock, CheckCircle2, Search, Telescope, Eye, CheckSquare
} from "lucide-react";

interface ProspectsPipelineProps {
  fullView?: boolean;
}

interface Prospect {
  id: number;
  name: string;
  role: string;
  company: string;
  score: number;
  location: string;
  email?: string;
  phone?: string;
  status: string;
  avatar?: string;
  industry?: string;
}

interface PipelineStage {
  id: string;
  status: string;
  count: number;
  prospects: Prospect[];
  gradient: string;
  icon: any;
  description: string;
}

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
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [pipelineData, setPipelineData] = useState<PipelineStage[]>([]);
  const [allProspects, setAllProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const displayLimit = fullView ? 10 : 3;

  useEffect(() => {
    async function fetchProspects() {
      try {
        const response = await fetch('/api/prospects?limit=50');
        const data = await response.json();
        
        if (data.success) {
          // Organiser les prospects par statut
          const prospects = data.prospects.map((p: any) => ({
            ...p,
            avatar: p.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '?'
          }));
          
          setAllProspects(prospects);
          organizeProspects(prospects);
        }
      } catch (error) {
        console.error('Error fetching prospects:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProspects();
  }, [displayLimit]);

  // Function to organize prospects into stages - ALWAYS returns all 5 stages
  const organizeProspects = (prospects: Prospect[]) => {
    const filtered = searchQuery 
      ? prospects.filter((p: Prospect) => 
          p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.role?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : prospects;
    
    const stages: PipelineStage[] = [
      {
        id: "new",
        status: "Identifiés",
        count: prospects.filter((p: Prospect) => p.status === 'new').length,
        prospects: filtered.filter((p: Prospect) => p.status === 'new').slice(0, displayLimit),
        gradient: "from-slate-500 to-slate-600",
        icon: Eye,
        description: "Prospects identifiés"
      },
      {
        id: "contacted",
        status: "Contactés",
        count: prospects.filter((p: Prospect) => p.status === 'contacted').length,
        prospects: filtered.filter((p: Prospect) => p.status === 'contacted').slice(0, displayLimit),
        gradient: "from-blue-500 to-blue-600",
        icon: Mail,
        description: "Premier contact établi"
      },
      {
        id: "responded",
        status: "Réponses",
        count: prospects.filter((p: Prospect) => p.status === 'responded').length,
        prospects: filtered.filter((p: Prospect) => p.status === 'responded').slice(0, displayLimit),
        gradient: "from-purple-500 to-purple-600",
        icon: MessageIcon,
        description: "Réponse reçue"
      },
      {
        id: "qualified",
        status: "Qualifiés",
        count: prospects.filter((p: Prospect) => p.status === 'qualified').length,
        prospects: filtered.filter((p: Prospect) => p.status === 'qualified').slice(0, displayLimit),
        gradient: "from-cyan-500 to-cyan-600",
        icon: Star,
        description: "Intérêt confirmé"
      },
      {
        id: "converted",
        status: "Convertis",
        count: prospects.filter((p: Prospect) => p.status === 'converted').length,
        prospects: filtered.filter((p: Prospect) => p.status === 'converted').slice(0, displayLimit),
        gradient: "from-green-500 to-green-600",
        icon: CheckSquare,
        description: "Client converti"
      }
    ];
    
    setPipelineData(stages);
  };

  // Update pipeline when search changes - ALWAYS show all stages
  useEffect(() => {
    organizeProspects(allProspects);
  }, [searchQuery]);

  const totalProspects = pipelineData.reduce((acc, stage) => acc + stage.count, 0);
  const totalConverted = pipelineData.find(s => s.id === 'converted')?.count || 0;
  const globalConversionRate = totalProspects > 0 ? Math.round((totalConverted / totalProspects) * 100) : 0;

  return (
    <div className={fullView ? "w-full" : ""}>
      {!fullView ? (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Prospects</h2>
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
          {/* Header with search */}
          <div className="flex flex-col gap-4 mb-4">
            {/* Title row with search */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-600 shrink-0" />
                <h1 className="text-3xl font-bold text-gray-900">Prospects</h1>
              </div>
              
              {/* Search bar aligned with title */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher des prospects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  />
                </div>
              </div>
            </div>
            
            {/* Subtitles below */}
            <div className="-mt-2">
              <p className="text-gray-500 text-base">Gérez vos prospects et votre pipeline de conversion</p>
              <p className="text-gray-900 font-semibold text-base">Pipeline CRM</p>
            </div>
          </div>
          
          {/* Stats globales - style cohérent avec Campaigns */}
          <div className="grid grid-cols-4 gap-3 mt-3">
            {[
              { label: "Total", value: totalProspects, icon: Users, color: "text-blue-600", bgColor: "bg-blue-50" },
              { label: "Convertis", value: totalConverted, icon: Trophy, color: "text-green-600", bgColor: "bg-green-50" },
              { label: "Taux", value: `${globalConversionRate}%`, icon: TrendingUp, color: "text-purple-600", bgColor: "bg-purple-50" },
              { label: "En cours", value: totalProspects - totalConverted, icon: Clock, color: "text-amber-600", bgColor: "bg-amber-50" },
            ].map((stat) => (
              <Card key={stat.label} className="border border-gray-100 shadow-sm">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${stat.bgColor} rounded-xl flex items-center justify-center`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                      <p className="text-xs text-gray-500">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
                    {stage.count > 0 ? Math.round((stage.prospects.length / stage.count) * 100) : 0}%
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

                        {/* Industry */}
                        {prospect.industry && (
                          <div className="flex flex-wrap gap-1 mb-1.5">
                            <span className="text-[9px] px-1 py-0.5 bg-gray-100 text-gray-600 rounded">
                              {prospect.industry}
                            </span>
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
                          <span className="text-[9px] text-gray-400">Score: {prospect.score}</span>
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
                
                {/* Empty state */}
                {stage.prospects.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                      <Search className="w-4 h-4 text-gray-400" />
                    </div>
                    <p className="text-gray-400 text-xs">Aucun prospect</p>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
