"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { createPortal } from "react-dom";
import { 
  User, Building2, MapPin, Star, Plus, TrendingUp, Target, 
  Filter, MoreHorizontal, Mail, Phone, Calendar, ArrowRight,
  Sparkles, Zap, Trophy, Flame, Crown, Award, TrendingDown,
  Users, BarChart3, Clock, CheckCircle2, Search, Telescope, Eye, CheckSquare,
  X, Rocket, ChevronRight, ChevronLeft, UserPlus, Trash2, Send, MessageSquare
} from "lucide-react";

function cleanDisplayName(name: string): string {
  if (!name) return '';
  let cleaned = name.split(/[|·•—–«»@\n]/)[0].trim();
  cleaned = cleaned.replace(/\(.*?\)/g, '').trim();
  cleaned = cleaned.replace(/\s+(chez|at|de|du|des|pour)\s+.*/i, '').trim();
  const words = cleaned.split(/\s+/).filter(w => w.length > 0);
  if (words.length > 3) return words.slice(0, 3).join(' ');
  return cleaned;
}

function getInitials(name: string): string {
  const cleaned = cleanDisplayName(name);
  const parts = cleaned.split(/\s+/).filter(w => w.length > 0);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

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
  linkedin_url?: string;
  notes?: string;
}

interface PipelineStage {
  id: string;
  status: string;
  count: number;
  prospects: Prospect[];
  gradient: string;
  textColor: string;
  iconBg: string;
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

  // Add prospect modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addStage, setAddStage] = useState<string>("new");
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    company: "",
    industry: "",
    location: "",
    email: "",
    phone: "",
    score: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Drag and drop state
  const [draggedProspect, setDraggedProspect] = useState<Prospect | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  // Contact info popup state
  const [contactPopup, setContactPopup] = useState<{type: 'email' | 'phone', value: string | null, prospectName: string} | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{prospectId: number, prospectName: string} | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchProspects = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      // Synchroniser les statuts avant de charger (prospects contactés mais encore en "new")
      await fetch('/api/prospects/sync-status', { method: 'POST' }).catch(() => {});
      const response = await fetch('/api/prospects?limit=100');
      const data = await response.json();
      
      if (data.success) {
        const prospects = data.prospects.map((p: any) => ({
          ...p,
          avatar: getInitials(p.name)
        }));
        
        setAllProspects(prospects);
        organizeProspects(prospects);
      }
    } catch (error) {
      console.error('Error fetching prospects:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchProspects();
  }, [displayLimit]);

  // Auto-refresh toutes les 10 secondes pour suivre les mises à jour de l'extension
  useEffect(() => {
    const interval = setInterval(() => fetchProspects(true), 10000);
    return () => clearInterval(interval);
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
        gradient: "bg-red-100 border-red-400",
        textColor: "text-red-800",
        iconBg: "bg-red-200",
        icon: Eye,
        description: "Prospects identifiés"
      },
      {
        id: "connected",
        status: "Connectés",
        count: prospects.filter((p: Prospect) => p.status === 'connected').length,
        prospects: filtered.filter((p: Prospect) => p.status === 'connected').slice(0, displayLimit),
        gradient: "bg-slate-100 border-slate-400",
        textColor: "text-slate-800",
        iconBg: "bg-slate-200",
        icon: UserPlus,
        description: "Connexion acceptée"
      },
      {
        id: "contacted",
        status: "Contactés",
        count: prospects.filter((p: Prospect) => p.status === 'contacted').length,
        prospects: filtered.filter((p: Prospect) => p.status === 'contacted').slice(0, displayLimit),
        gradient: "bg-blue-100 border-blue-400",
        textColor: "text-blue-800",
        iconBg: "bg-blue-200",
        icon: Mail,
        description: "Premier contact établi"
      },
      {
        id: "responded",
        status: "Réponses",
        count: prospects.filter((p: Prospect) => p.status === 'responded').length,
        prospects: filtered.filter((p: Prospect) => p.status === 'responded').slice(0, displayLimit),
        gradient: "bg-purple-100 border-purple-400",
        textColor: "text-purple-900",
        iconBg: "bg-purple-200",
        icon: MessageIcon,
        description: "Réponse reçue"
      },
      {
        id: "qualified",
        status: "Intéressés",
        count: prospects.filter((p: Prospect) => p.status === 'qualified').length,
        prospects: filtered.filter((p: Prospect) => p.status === 'qualified').slice(0, displayLimit),
        gradient: "bg-yellow-100 border-yellow-400",
        textColor: "text-yellow-800",
        iconBg: "bg-yellow-200",
        icon: Star,
        description: "Intérêt confirmé"
      },
      {
        id: "converted",
        status: "Convertis",
        count: prospects.filter((p: Prospect) => p.status === 'converted').length,
        prospects: filtered.filter((p: Prospect) => p.status === 'converted').slice(0, displayLimit),
        gradient: "bg-emerald-100 border-emerald-400",
        textColor: "text-emerald-900",
        iconBg: "bg-emerald-200",
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

  // Handle add prospect modal
  const openAddModal = (stageId: string) => {
    setAddStage(stageId);
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setAddError(null);
    setFormData({
      name: "",
      role: "",
      company: "",
      industry: "",
      location: "",
      email: "",
      phone: "",
      score: 50,
    });
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Submit new prospect to API
  const handleAddProspect = async () => {
    if (!formData.name.trim()) return;
    
    setSubmitting(true);
    setAddError(null);
    try {
      // Parse score properly
      const scoreValue = parseInt(String(formData.score), 10);
      const validScore = isNaN(scoreValue) ? 50 : Math.max(0, Math.min(100, scoreValue));
      
      // Map pipeline stage ID to valid DB status
      const stageToStatus: Record<string, string> = {
        new: "new",
        identified: "new",
        connected: "connected",
        contacted: "contacted",
        responded: "responded",
        qualified: "qualified",
        converted: "converted",
        lost: "lost",
      };
      const dbStatus = stageToStatus[addStage] || "new";
      
      // Build payload with proper type conversion
      const payload: any = {
        name: formData.name.trim(),
        status: dbStatus,
        score: validScore,
      };
      
      // Only add optional fields if they have value
      const role = formData.role?.trim();
      const company = formData.company?.trim();
      const industry = formData.industry?.trim();
      const location = formData.location?.trim();
      const phone = formData.phone?.trim();
      const email = formData.email?.trim();
      
      if (role) payload.role = role;
      if (company) payload.company = company;
      if (industry) payload.industry = industry;
      if (location) payload.location = location;
      if (phone) payload.phone = phone;
      if (email && email.includes('@')) payload.email = email;
      
      const response = await fetch('/api/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const data = await response.json();
      
      if (data.success) {
        const newProspect: Prospect = {
          ...data.prospect,
          avatar: getInitials(data.prospect.name)
        };
        
        const updatedProspects = [newProspect, ...allProspects];
        setAllProspects(updatedProspects);
        organizeProspects(updatedProspects);
        closeAddModal();
      } else {
        setAddError(data.details || data.error || "Erreur inconnue");
        console.error('Error adding prospect:', data.error, data.details);
      }
    } catch (error) {
      setAddError("Erreur réseau, veuillez réessayer");
      console.error('Error adding prospect:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, prospect: Prospect) => {
    setDraggedProspect(prospect);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(prospect.id));
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStage !== stageId) setDragOverStage(stageId);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    setDragOverStage(null);

    if (!draggedProspect) return;
    if (draggedProspect.status === targetStageId) {
      setDraggedProspect(null);
      return;
    }

    // Optimistic update
    const updatedProspects = allProspects.map(p =>
      p.id === draggedProspect.id ? { ...p, status: targetStageId } : p
    );
    setAllProspects(updatedProspects);
    organizeProspects(updatedProspects);
    setDraggedProspect(null);

    // Persist to API
    try {
      await fetch(`/api/prospects/${draggedProspect.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStageId }),
      });
    } catch (error) {
      console.error('Error updating prospect status:', error);
      // Revert on error
      fetchProspects(true);
    }
  };

  const handleDragEnd = () => {
    setDraggedProspect(null);
    setDragOverStage(null);
  };

  // Recalculate scores for all existing prospects
  const handleRecalculateScores = async () => {
    setRecalculating(true);
    try {
      const res = await fetch('/api/prospects/recalculate-scores', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await fetchProspects(true);
      }
    } catch (e) {
      console.error('Recalculate scores error:', e);
    } finally {
      setRecalculating(false);
    }
  };

  // Delete prospect
  const handleDeleteProspect = async () => {
    if (!deleteConfirm) return;
    
    setDeleting(true);
    try {
      const response = await fetch(`/api/prospects/${deleteConfirm.prospectId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Remove from local state
        const updatedProspects = allProspects.filter(p => p.id !== deleteConfirm.prospectId);
        setAllProspects(updatedProspects);
        organizeProspects(updatedProspects);
        setDeleteConfirm(null);
      } else {
        console.error('Error deleting prospect:', data.error, data.details);
        alert(`Erreur: ${data.error}\n${data.details || ''}`);
      }
    } catch (error) {
      console.error('Error deleting prospect:', error);
    } finally {
      setDeleting(false);
    }
  };

  const totalProspects = pipelineData.reduce((acc, stage) => acc + stage.count, 0);
  const totalContacted = pipelineData.find(s => s.id === 'contacted')?.count || 0;
  const totalResponded = pipelineData.find(s => s.id === 'responded')?.count || 0;
  const totalConverted = pipelineData.find(s => s.id === 'converted')?.count || 0;
  const globalConversionRate = totalProspects > 0 ? Math.round((totalConverted / totalProspects) * 100) : 0;
  const responseRate = totalContacted > 0 ? Math.round((totalResponded / totalContacted) * 100) : 0;

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
              <div className="flex items-center gap-2 flex-1 max-w-lg">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher des prospects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  />
                </div>
                <button
                  onClick={handleRecalculateScores}
                  disabled={recalculating}
                  title="Recalculer les scores de tous les prospects"
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-medium transition-colors disabled:opacity-50 shrink-0"
                >
                  <Flame className="w-4 h-4" />
                  {recalculating ? 'Calcul...' : 'Scores'}
                </button>
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
              { label: "Total", value: totalProspects, icon: Users, color: "text-orange-600", bgColor: "bg-orange-50" },
              { label: "Contactés", value: allProspects.filter((p: Prospect) => p.status === 'contacted').length, icon: Mail, color: "text-blue-600", bgColor: "bg-blue-50" },
              { label: "Réponses", value: allProspects.filter((p: Prospect) => p.status === 'responded').length, icon: MessageIcon, color: "text-purple-600", bgColor: "bg-purple-50" },
              { label: "Convertis", value: totalConverted, icon: CheckSquare, color: "text-green-600", bgColor: "bg-green-50" },
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
              {/* Column header avec couleurs claires */}
              <div 
                className={`${stage.gradient} border rounded-lg p-2.5 mb-1.5 shadow-sm cursor-pointer hover:shadow-md transition-shadow`}
                onClick={() => setSelectedStage(isSelected ? null : stage.id)}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-6 h-6 ${stage.iconBg} rounded-lg flex items-center justify-center`}>
                      <StageIcon className={`w-3 h-3 ${stage.textColor}`} />
                    </div>
                    <span className={`${stage.textColor} font-semibold text-sm`}>{stage.status}</span>
                  </div>
                  <Badge className={`${stage.iconBg} ${stage.textColor} border-0 font-bold text-xs px-1.5 py-0`}>
                    {stage.count}
                  </Badge>
                </div>
                
                {/* Mini stats */}
                <div className={`flex items-center gap-2 text-[10px] ${stage.textColor} opacity-80`}>
                  <span className="flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" />
                    {stage.count > 0 ? Math.round((stage.prospects.length / stage.count) * 100) : 0}%
                  </span>
                </div>
              </div>

              {/* Cards container */}
              <div 
                className={`bg-gray-50/80 rounded-lg flex-1 p-1.5 space-y-1.5 min-h-32 border transition-all duration-200 ${
                  dragOverStage === stage.id 
                    ? 'border-blue-400 bg-blue-50/50 ring-2 ring-blue-200' 
                    : 'border-gray-100'
                }`}
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
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
                        draggable
                        onDragStart={(e) => handleDragStart(e as any, prospect)}
                        onDragEnd={handleDragEnd}
                        onMouseEnter={() => setHoveredCard(prospect.id)}
                        onMouseLeave={() => setHoveredCard(null)}
                        className={`bg-white rounded-lg p-2 shadow-sm hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing border border-gray-100 ${isHovered ? "ring-2 ring-blue-500/20 -translate-y-0.5" : ""} ${draggedProspect?.id === prospect.id ? "opacity-50 scale-95" : ""}`}
                      >
                        {/* Header avec avatar et nom */}
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className={`w-8 h-8 rounded-full ${stage.iconBg} border ${stage.gradient.split(' ')[1]} flex items-center justify-center shrink-0 text-gray-700 font-bold text-xs`}>
                            {prospect.avatar}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <p className="text-sm font-semibold text-gray-900 truncate">{cleanDisplayName(prospect.name)}</p>
                              {prospect.linkedin_url && (
                                <a href={prospect.linkedin_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} title="Voir sur LinkedIn" className="shrink-0 text-blue-500 hover:text-blue-700">
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                                </a>
                              )}
                            </div>
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
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setContactPopup({
                                    type: 'email',
                                    value: prospect.email || null,
                                    prospectName: prospect.name
                                  });
                                }}
                                className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" 
                                title={prospect.email || "Email indisponible"}
                              >
                                <Mail className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setContactPopup({
                                    type: 'phone',
                                    value: prospect.phone || null,
                                    prospectName: prospect.name
                                  });
                                }}
                                className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors" 
                                title={prospect.phone || "Téléphone indisponible"}
                              >
                                <Phone className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirm({
                                    prospectId: prospect.id,
                                    prospectName: prospect.name
                                  });
                                }}
                                className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors" 
                                title="Supprimer"
                              >
                                <Trash2 className="w-3 h-3" />
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
                  onClick={() => openAddModal(stage.id)}
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

      {/* Add Prospect Modal */}
      {mounted && showAddModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="absolute inset-0 bg-black/60" 
            onClick={closeAddModal} 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            {/* Header avec bande colorée subtile */}
            <div className="border-b border-gray-100 bg-white border-t-4 border-t-blue-500 px-5 pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Nouveau prospect</h2>
                    <p className="text-sm text-gray-500">Ajouter à la colonne &quot;{pipelineData.find(s => s.id === addStage)?.status}&quot;</p>
                  </div>
                </div>
                <button onClick={closeAddModal} className="w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg flex items-center justify-center transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nom *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Jean Dupont"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Poste</label>
                  <input
                    type="text"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    placeholder="CEO"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Entreprise</label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleInputChange}
                    placeholder="Acme Inc."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Industrie</label>
                  <input
                    type="text"
                    name="industry"
                    value={formData.industry}
                    onChange={handleInputChange}
                    placeholder="SaaS"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Localisation</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="Paris, France"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Score (0-100)</label>
                  <input
                    type="number"
                    name="score"
                    min="0"
                    max="100"
                    value={formData.score}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="jean@example.com"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Téléphone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+33 6 12 34 56 78"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Score preview */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Score du prospect</span>
                  <span className={`text-lg font-bold ${formData.score >= 75 ? 'text-emerald-600' : formData.score >= 50 ? 'text-blue-600' : 'text-amber-600'}`}>
                    {formData.score}/100
                  </span>
                </div>
                <input
                  type="range"
                  name="score"
                  min="0"
                  max="100"
                  value={formData.score}
                  onChange={handleInputChange}
                  className="w-full mt-2 accent-blue-600"
                />
              </div>
            </div>

            {/* Error message */}
            {addError && (
              <div className="mx-5 mb-0 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <X className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-700">{addError}</p>
              </div>
            )}

            {/* Footer */}
            <div className="p-5 border-t border-gray-100 flex justify-between">
              <button
                onClick={closeAddModal}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleAddProspect}
                disabled={!formData.name.trim() || submitting}
                className={`flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium transition-all ${
                  !formData.name.trim() || submitting
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-blue-700 shadow-lg shadow-blue-500/30'
                }`}
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Ajouter
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
      {/* Contact Info Popup */}
      {mounted && contactPopup && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="absolute inset-0 bg-black/40" 
            onClick={() => setContactPopup(null)} 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-xs bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className={`px-4 py-3 ${contactPopup.type === 'email' ? 'bg-blue-50' : 'bg-green-50'}`}>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${contactPopup.type === 'email' ? 'bg-blue-100' : 'bg-green-100'}`}>
                  {contactPopup.type === 'email' ? <Mail className="w-4 h-4 text-blue-600" /> : <Phone className="w-4 h-4 text-green-600" />}
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-900">
                    {contactPopup.type === 'email' ? 'Email' : 'Téléphone'}
                  </h3>
                  <p className="text-xs text-gray-500">{contactPopup.prospectName}</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              {contactPopup.value ? (
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-900 mb-3 px-2 py-2 bg-gray-50 rounded-lg break-all">{contactPopup.value}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(contactPopup.value || '');
                        setContactPopup(null);
                      }}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium text-white transition-colors ${
                        contactPopup.type === 'email' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      Copier
                    </button>
                    {contactPopup.type === 'email' && (
                      <a 
                        href={`mailto:${contactPopup.value}`}
                        className="px-3 py-2 rounded-lg text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200"
                        title="Envoyer email"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </a>
                    )}
                    {contactPopup.type === 'phone' && (
                      <a 
                        href={`tel:${contactPopup.value}`}
                        className="px-3 py-2 rounded-lg text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 border border-green-200"
                        title="Appeler"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    {contactPopup.type === 'email' ? <Mail className="w-6 h-6 text-gray-400" /> : <Phone className="w-6 h-6 text-gray-400" />}
                  </div>
                  <p className="text-gray-500 font-medium text-sm">
                    {contactPopup.type === 'email' ? 'Email indisponible' : 'Numéro indisponible'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Aucune information enregistrée
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setContactPopup(null)}
                className="w-full py-2 text-xs text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Fermer
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {mounted && deleteConfirm && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="absolute inset-0 bg-black/50" 
            onClick={() => setDeleteConfirm(null)} 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-xs bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-red-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <Trash2 className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-900">Supprimer le prospect</h3>
                  <p className="text-xs text-gray-500">{deleteConfirm.prospectName}</p>
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
                  Supprimer définitivement ce prospect ?
                </p>
                <p className="text-xs text-gray-400 mt-1">Cette action est irréversible</p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 py-2 text-xs text-gray-600 hover:text-gray-900 font-medium transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteProspect}
                disabled={deleting}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {deleting ? (
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
        </div>,
        document.body
      )}
    </div>
  );
}
