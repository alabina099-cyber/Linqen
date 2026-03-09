"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Plus, Play, Pause, Trash2, Settings, Users, MessageSquare, TrendingUp, X,
  ChevronRight, Calendar, Target, Sparkles, Rocket, Zap, CheckCircle,
  ChevronLeft, Globe, Clock, Mail, BarChart3, Filter, Search,
  Edit3, Copy, Eye, Award, Crown, Star, Flame, Compass, 
  MapPin, Building2, UserCircle, Send, Bell, LayoutGrid, List,
} from "lucide-react";

// Icon Link custom
function LinkIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

interface Campaign {
  id: number;
  name: string;
  status: "active" | "paused" | "draft" | "completed";
  target: string;
  template: string;
  startDate: string;
  contacted: number;
  replied: number;
  clicked: number;
  converted: number;
  description?: string;
  industry?: string;
  location?: string;
  companySize?: string;
}

const initialCampaigns: Campaign[] = [
  {
    id: 1,
    name: "CTOs Tech Paris",
    status: "active",
    target: "CTO, VP Engineering",
    template: "Premier contact",
    startDate: "01 Mar 2026",
    contacted: 142,
    replied: 28,
    clicked: 15,
    converted: 4,
    description: "Ciblage des décideurs techniques",
    industry: "Technologie",
    location: "Île-de-France",
    companySize: "50-500 employés",
  },
  {
    id: 2,
    name: "Fondateurs SaaS B2B",
    status: "active",
    target: "Founder, CEO",
    template: "Message de suivi",
    startDate: "20 Fév 2026",
    contacted: 89,
    replied: 18,
    clicked: 9,
    converted: 2,
    description: "Prospection fondateurs de startups",
    industry: "SaaS",
    location: "France",
    companySize: "10-100 employés",
  },
  {
    id: 3,
    name: "Directeurs Marketing",
    status: "paused",
    target: "CMO, Marketing Director",
    template: "Premier contact",
    startDate: "10 Fév 2026",
    contacted: 56,
    replied: 9,
    clicked: 4,
    converted: 1,
    description: "Campagne pour professionnels marketing",
    industry: "Marketing",
    location: "France",
    companySize: "50+ employés",
  },
  {
    id: 4,
    name: "Scale-ups Series A",
    status: "draft",
    target: "CEO, COO",
    template: "Partage de lien",
    startDate: "—",
    contacted: 0,
    replied: 0,
    clicked: 0,
    converted: 0,
    description: "Scale-ups ayant levé des fonds",
    industry: "Startup",
    location: "Europe",
    companySize: "50-200 employés",
  },
];

const statusConfig = {
  active: { label: "Active", color: "text-green-700", bgColor: "bg-green-100", borderColor: "border-green-200", icon: Play },
  paused: { label: "En pause", color: "text-amber-700", bgColor: "bg-amber-100", borderColor: "border-amber-200", icon: Pause },
  draft: { label: "Brouillon", color: "text-slate-700", bgColor: "bg-slate-100", borderColor: "border-slate-200", icon: Edit3 },
  completed: { label: "Terminée", color: "text-blue-700", bgColor: "bg-blue-100", borderColor: "border-blue-200", icon: CheckCircle },
};

const templates = [
  { name: "Premier contact", icon: Send, desc: "Message d'introduction", color: "bg-blue-500" },
  { name: "Message de suivi", icon: Clock, desc: "Relance après connexion", color: "bg-purple-500" },
  { name: "Partage de lien", icon: LinkIcon, desc: "Contenu pertinent", color: "bg-cyan-500" },
  { name: "Relance finale", icon: Bell, desc: "Dernière tentative", color: "bg-orange-500" },
  { name: "Invitation événement", icon: Calendar, desc: "Webinar/event", color: "bg-pink-500" },
  { name: "Démonstration", icon: Eye, desc: "Démo produit", color: "bg-green-500" },
];

const industries = ["Toutes industries", "Technologie / SaaS", "Finance", "Marketing", "Consulting", "E-commerce", "Santé", "Éducation"];
const locations = ["France entière", "Île-de-France", "Lyon", "Marseille", "Bordeaux", "Lille", "Nantes", "Europe"];
const companySizes = ["Toutes tailles", "Startup (1-10)", "PME (11-50)", "Entreprise (51-200)", "Grande entreprise (200+)"];

interface CampaignForm {
  name: string;
  description: string;
  target: string;
  template: string;
  industry: string;
  location: string;
  companySize: string;
  dailyLimit: number;
  followUpDays: number;
  objective: string;
  seniority: string[];
}

const emptyForm: CampaignForm = {
  name: "", description: "", target: "", template: "",
  industry: "Toutes industries", location: "France entière", companySize: "Toutes tailles",
  dailyLimit: 20, followUpDays: 3, objective: "", seniority: [],
};

const seniorityOptions = [
  { id: "c-level", label: "C-Level", icon: Crown },
  { id: "vp", label: "VP / Directeur", icon: Star },
  { id: "manager", label: "Manager", icon: Award },
  { id: "senior", label: "Senior", icon: Flame },
  { id: "junior", label: "Junior", icon: Compass },
];

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CampaignForm>(emptyForm);
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isHovered, setIsHovered] = useState<number | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const toggleStatus = (id: number) => {
    setCampaigns((prev) => prev.map((c) => c.id === id ? { ...c, status: c.status === "active" ? "paused" : c.status === "paused" ? "active" : c.status === "draft" ? "active" : c.status } : c));
  };

  const deleteCampaign = (id: number) => {
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const duplicateCampaign = (campaign: Campaign) => {
    const newCampaign: Campaign = { ...campaign, id: Date.now(), name: `${campaign.name} (copie)`, status: "draft", startDate: "—", contacted: 0, replied: 0, clicked: 0, converted: 0 };
    setCampaigns((prev) => [newCampaign, ...prev]);
  };

  const createCampaign = () => {
    if (!form.name.trim()) return;
    const newCampaign: Campaign = {
      id: Date.now(), name: form.name, status: "draft", target: form.target || "À définir",
      template: form.template || "Premier contact", startDate: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
      contacted: 0, replied: 0, clicked: 0, converted: 0,
      description: form.description, industry: form.industry, location: form.location, companySize: form.companySize,
    };
    setCampaigns((prev) => [newCampaign, ...prev]);
    setForm(emptyForm);
    setShowModal(false);
    setCurrentStep(1);
  };

  const openModal = () => { setForm(emptyForm); setCurrentStep(1); setShowModal(true); };
  const closeModal = () => { setForm(emptyForm); setShowModal(false); setCurrentStep(1); };
  const nextStep = () => { if (currentStep < 4) setCurrentStep(currentStep + 1); };
  const prevStep = () => { if (currentStep > 1) setCurrentStep(currentStep - 1); };
  const rate = (a: number, b: number) => b === 0 ? "0%" : `${Math.round((a / b) * 100)}%`;

  const filteredCampaigns = campaigns.filter((c) => {
    const matchesStatus = filterStatus === "all" || c.status === filterStatus;
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.target.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = [
    { label: "Campagnes actives", value: campaigns.filter((c) => c.status === "active").length, icon: Rocket, color: "from-green-500 to-emerald-600", bgColor: "bg-green-50", textColor: "text-green-600" },
    { label: "Total contactés", value: campaigns.reduce((s, c) => s + c.contacted, 0), icon: Users, color: "from-blue-500 to-indigo-600", bgColor: "bg-blue-50", textColor: "text-blue-600" },
    { label: "Total réponses", value: campaigns.reduce((s, c) => s + c.replied, 0), icon: MessageSquare, color: "from-purple-500 to-violet-600", bgColor: "bg-purple-50", textColor: "text-purple-600" },
    { label: "Total conversions", value: campaigns.reduce((s, c) => s + c.converted, 0), icon: TrendingUp, color: "from-orange-500 to-red-600", bgColor: "bg-orange-50", textColor: "text-orange-600" },
  ];

  const funnelData = [
    { label: "Contactés", value: campaigns.reduce((s, c) => s + c.contacted, 0), color: "bg-blue-500" },
    { label: "Réponses", value: campaigns.reduce((s, c) => s + c.replied, 0), color: "bg-purple-500" },
    { label: "Clics", value: campaigns.reduce((s, c) => s + c.clicked, 0), color: "bg-cyan-500" },
    { label: "Conversions", value: campaigns.reduce((s, c) => s + c.converted, 0), color: "bg-green-500" },
  ];
  const maxFunnelValue = Math.max(...funnelData.map(d => d.value)) || 1;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header compact avec dégradé */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-4 text-white shadow-xl"
      >
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_70%)]" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Campagnes</h1>
              <p className="text-blue-100 text-sm">Gérez vos campagnes de prospection</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur rounded-lg text-sm">
              <Zap className="w-4 h-4 text-yellow-300" />
              <span>{campaigns.filter(c => c.status === "active").length} actives</span>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={openModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-white text-blue-600 rounded-lg font-medium text-sm shadow-md hover:shadow-lg transition-shadow"
            >
              <Plus className="w-4 h-4" />
              Nouvelle
            </motion.button>
          </div>
        </div>

        {/* Funnel visuel compact */}
        <div className="mt-4 grid grid-cols-4 gap-2">
          {funnelData.map((step, idx) => (
            <motion.div key={step.label} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.1 }} className="relative">
              <div className="bg-white/10 backdrop-blur rounded-lg p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-blue-100">{step.label}</span>
                  <span className="text-lg font-bold">{step.value}</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-1.5">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(step.value / maxFunnelValue) * 100}%` }} transition={{ duration: 1, delay: 0.5 + idx * 0.1 }} className={`h-1.5 rounded-full ${step.color}`} />
                </div>
              </div>
              {idx < 3 && <div className="absolute top-1/2 -right-1 transform -translate-y-1/2 text-white/30"><ChevronRight className="w-3 h-3" /></div>}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Stats Cards compactes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
              <Card className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  <div className="flex items-center">
                    <div className={`w-14 h-16 bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 p-3">
                      <p className={`text-2xl font-bold ${stat.textColor}`}>{stat.value}</p>
                      <p className="text-xs text-gray-500">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Barre d'outils compacte */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-white shadow-sm text-blue-600" : "text-gray-500"}`}><List className="w-4 h-4" /></button>
            <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-white shadow-sm text-blue-600" : "text-gray-500"}`}><LayoutGrid className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">Tous les statuts</option>
            <option value="active">Actives</option>
            <option value="paused">En pause</option>
            <option value="draft">Brouillons</option>
            <option value="completed">Terminées</option>
          </select>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Liste des campagnes */}
        <div className="flex-1">
          {viewMode === "list" ? (
            <div className="space-y-4">
              <AnimatePresence>
                {filteredCampaigns.map((campaign, idx) => (
                  <motion.div key={campaign.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ delay: idx * 0.05 }} onMouseEnter={() => setIsHovered(campaign.id)} onMouseLeave={() => setIsHovered(null)}>
                    <Card onClick={() => setSelected(campaign)} className={`cursor-pointer overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-200 ${selected?.id === campaign.id ? "ring-2 ring-blue-500 shadow-lg" : ""} ${isHovered === campaign.id ? "-translate-y-0.5" : ""}`}>
                      <CardContent className="p-0">
                        <div className="flex">
                          <div className={`w-1.5 ${campaign.status === 'active' ? 'bg-green-500' : campaign.status === 'paused' ? 'bg-amber-500' : campaign.status === 'draft' ? 'bg-slate-400' : 'bg-blue-500'}`} />
                          <div className="flex-1 p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-lg ${statusConfig[campaign.status].bgColor} flex items-center justify-center`}>
                                  {React.createElement(statusConfig[campaign.status].icon, { className: `w-4 h-4 ${statusConfig[campaign.status].color}` })}
                                </div>
                                <div>
                                  <h3 className="font-semibold text-gray-900 text-sm">{campaign.name}</h3>
                                  <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <Target className="w-3 h-3" />
                                    {campaign.target}
                                    {campaign.location && <><span className="mx-0.5">•</span><MapPin className="w-3 h-3" />{campaign.location}</>}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Badge className={`${statusConfig[campaign.status].bgColor} ${statusConfig[campaign.status].color} border-0 text-xs px-2 py-0.5`}>{statusConfig[campaign.status].label}</Badge>
                                <div className="flex gap-0.5">
                                  <button onClick={(e) => { e.stopPropagation(); duplicateCampaign(campaign); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Dupliquer"><Copy className="w-3.5 h-3.5" /></button>
                                  {(campaign.status === "active" || campaign.status === "paused") && (
                                    <button onClick={(e) => { e.stopPropagation(); toggleStatus(campaign.id); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title={campaign.status === "active" ? "Mettre en pause" : "Reprendre"}>{campaign.status === "active" ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}</button>
                                  )}
                                  {campaign.status === "draft" && (
                                    <button onClick={(e) => { e.stopPropagation(); toggleStatus(campaign.id); }} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors" title="Lancer"><Play className="w-3.5 h-3.5" /></button>
                                  )}
                                  <button onClick={(e) => { e.stopPropagation(); deleteCampaign(campaign.id); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Supprimer"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                              {[
                                { label: "Contactés", value: campaign.contacted, color: "text-blue-600", bg: "bg-blue-50" },
                                { label: "Réponses", value: `${campaign.replied} (${rate(campaign.replied, campaign.contacted)})`, color: "text-purple-600", bg: "bg-purple-50" },
                                { label: "Clics", value: `${campaign.clicked} (${rate(campaign.clicked, campaign.contacted)})`, color: "text-cyan-600", bg: "bg-cyan-50" },
                                { label: "Conversions", value: `${campaign.converted} (${rate(campaign.converted, campaign.contacted)})`, color: "text-green-600", bg: "bg-green-50" },
                              ].map((m) => (
                                <div key={m.label} className={`${m.bg} rounded-lg p-1.5 text-center`}>
                                  <p className={`text-sm font-bold ${m.color}`}>{m.value}</p>
                                  <p className="text-xs text-gray-500">{m.label}</p>
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{campaign.startDate}</span>
                                <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{campaign.template}</span>
                                {campaign.industry && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{campaign.industry}</span>}
                              </div>
                              <ChevronRight className={`w-4 h-4 text-gray-300 transition-transform ${selected?.id === campaign.id ? "rotate-90" : ""}`} />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
              {filteredCampaigns.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"><Search className="w-10 h-10 text-gray-400" /></div>
                  <p className="text-gray-500">Aucune campagne trouvée</p>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredCampaigns.map((campaign, idx) => (
                <motion.div key={campaign.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }}>
                  <Card onClick={() => setSelected(campaign)} className={`cursor-pointer overflow-hidden border-0 shadow-sm hover:shadow-md transition-all ${selected?.id === campaign.id ? "ring-2 ring-blue-500" : ""}`}>
                    <div className={`h-1.5 ${campaign.status === 'active' ? 'bg-green-500' : campaign.status === 'paused' ? 'bg-amber-500' : campaign.status === 'draft' ? 'bg-slate-400' : 'bg-blue-500'}`} />
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className={`w-8 h-8 rounded-lg ${statusConfig[campaign.status].bgColor} flex items-center justify-center`}>
                          {React.createElement(statusConfig[campaign.status].icon, { className: `w-4 h-4 ${statusConfig[campaign.status].color}` })}
                        </div>
                        <Badge className={`${statusConfig[campaign.status].bgColor} ${statusConfig[campaign.status].color} border-0 text-xs`}>{statusConfig[campaign.status].label}</Badge>
                      </div>
                      <h3 className="font-semibold text-gray-900 text-sm mb-1">{campaign.name}</h3>
                      <p className="text-xs text-gray-500 mb-2">{campaign.target}</p>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        <div className="bg-blue-50 rounded p-1.5 text-center"><p className="font-bold text-blue-600">{campaign.contacted}</p><p className="text-xs text-gray-500">Contactés</p></div>
                        <div className="bg-green-50 rounded p-1.5 text-center"><p className="font-bold text-green-600">{campaign.converted}</p><p className="text-xs text-gray-500">Conversions</p></div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Panel de détails */}
        <AnimatePresence>
          {selected && (
            <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} className="w-96 shrink-0">
              <Card className="border-0 shadow-xl sticky top-6 overflow-hidden">
                <div className={`h-2 ${selected.status === 'active' ? 'bg-green-500' : selected.status === 'paused' ? 'bg-amber-500' : selected.status === 'draft' ? 'bg-slate-400' : 'bg-blue-500'}`} />
                <CardHeader className="border-b pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl ${statusConfig[selected.status].bgColor} flex items-center justify-center`}>
                        {React.createElement(statusConfig[selected.status].icon, { className: `w-6 h-6 ${statusConfig[selected.status].color}` })}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{selected.name}</CardTitle>
                        <Badge className={`${statusConfig[selected.status].bgColor} ${statusConfig[selected.status].color} border-0 mt-1`}>{statusConfig[selected.status].label}</Badge>
                      </div>
                    </div>
                    <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-6">
                  {selected.description && <div className="bg-gray-50 rounded-xl p-4"><p className="text-sm text-gray-600">{selected.description}</p></div>}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2"><Target className="w-4 h-4" />Ciblage</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm"><UserCircle className="w-4 h-4 text-blue-500" /><span className="text-gray-600">Profil:</span><span className="font-medium">{selected.target}</span></div>
                      {selected.industry && <div className="flex items-center gap-2 text-sm"><Building2 className="w-4 h-4 text-purple-500" /><span className="text-gray-600">Industrie:</span><span className="font-medium">{selected.industry}</span></div>}
                      {selected.location && <div className="flex items-center gap-2 text-sm"><MapPin className="w-4 h-4 text-green-500" /><span className="text-gray-600">Localisation:</span><span className="font-medium">{selected.location}</span></div>}
                      {selected.companySize && <div className="flex items-center gap-2 text-sm"><Users className="w-4 h-4 text-orange-500" /><span className="text-gray-600">Taille:</span><span className="font-medium">{selected.companySize}</span></div>}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4" />Performance</h4>
                    <div className="space-y-3">
                      {[
                        { label: "Taux de réponse", value: rate(selected.replied, selected.contacted), color: "bg-purple-500" },
                        { label: "Taux de clic", value: rate(selected.clicked, selected.contacted), color: "bg-cyan-500" },
                        { label: "Taux de conversion", value: rate(selected.converted, selected.contacted), color: "bg-green-500" },
                      ].map((m) => (
                        <div key={m.label}>
                          <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">{m.label}</span><span className="font-bold">{m.value}</span></div>
                          <div className="w-full bg-gray-100 rounded-full h-2"><div className={`h-2 rounded-full ${m.color} transition-all duration-500`} style={{ width: m.value }} /></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-4 border-t border-gray-100">
                    <Button variant="outline" className="text-sm" onClick={() => duplicateCampaign(selected)}><Copy className="w-4 h-4 mr-2" />Dupliquer</Button>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white text-sm"><Settings className="w-4 h-4 mr-2" />Modifier</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal de création - 4 étapes */}
      {mounted && showModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Header avec dégradé */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center"><Rocket className="w-7 h-7" /></div>
                  <div>
                    <h2 className="text-2xl font-bold">Nouvelle campagne</h2>
                    <p className="text-blue-100">Configurez votre prospection en 4 étapes</p>
                  </div>
                </div>
                <button onClick={closeModal} className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors"><X className="w-5 h-5" /></button>
              </div>
              {/* Stepper */}
              <div className="flex items-center justify-center mt-6 gap-2">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex items-center">
                    <motion.div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-colors ${currentStep === step ? "bg-white text-blue-600" : currentStep > step ? "bg-green-400 text-white" : "bg-white/20 text-white"}`}>
                      {currentStep > step ? <CheckCircle className="w-5 h-5" /> : step}
                    </motion.div>
                    {step < 4 && <div className={`w-16 h-1 mx-2 rounded-full ${currentStep > step ? "bg-green-400" : "bg-white/20"}`} />}
                  </div>
                ))}
              </div>
            </div>

            {/* Contenu des étapes */}
            <div className="p-6">
              <AnimatePresence mode="wait">
                {currentStep === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                    <div className="text-center mb-6">
                      <h3 className="text-xl font-bold text-gray-900">Informations générales</h3>
                      <p className="text-gray-500">Donnez un nom et une description à votre campagne</p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Nom de la campagne <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: CEOs SaaS Paris" className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Description (optionnel)</label>
                        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Décrivez l'objectif..." rows={3} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Objectif</label>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { icon: Users, label: "Générer des leads", desc: "Qualification" },
                            { icon: Mail, label: "Démos produit", desc: "Présentations" },
                            { icon: Globe, label: "Étendre le réseau", desc: "Connexions" },
                            { icon: TrendingUp, label: "Croissance", desc: "Acquisition" },
                          ].map((obj) => (
                            <button key={obj.label} onClick={() => setForm({ ...form, objective: obj.label })} className={`p-4 border-2 rounded-xl text-left transition-all ${form.objective === obj.label ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                              <obj.icon className={`w-6 h-6 mb-2 ${form.objective === obj.label ? "text-blue-600" : "text-gray-400"}`} />
                              <p className={`font-semibold text-sm ${form.objective === obj.label ? "text-blue-900" : "text-gray-900"}`}>{obj.label}</p>
                              <p className="text-xs text-gray-500">{obj.desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {currentStep === 2 && (
                  <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                    <div className="text-center mb-6">
                      <h3 className="text-xl font-bold text-gray-900">Ciblage</h3>
                      <p className="text-gray-500">Définissez votre audience cible</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Profils cibles</label>
                        <div className="relative">
                          <Target className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} placeholder="Ex: CEO, CTO, Founder" className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Industrie</label>
                        <div className="relative">
                          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <select value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white">
                            {industries.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Localisation</label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <select value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white">
                            {locations.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Taille d'entreprise</label>
                        <div className="relative">
                          <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <select value={form.companySize} onChange={(e) => setForm({ ...form, companySize: e.target.value })} className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white">
                            {companySizes.map((size) => <option key={size} value={size}>{size}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">Niveau hiérarchique</label>
                      <div className="flex flex-wrap gap-2">
                        {seniorityOptions.map((seniority) => {
                          const isSelected = form.seniority.includes(seniority.id);
                          return (
                            <button key={seniority.id} onClick={() => { const newSeniority = isSelected ? form.seniority.filter((s) => s !== seniority.id) : [...form.seniority, seniority.id]; setForm({ ...form, seniority: newSeniority }); }} className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all ${isSelected ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 hover:border-gray-300 text-gray-600"}`}>
                              <seniority.icon className={`w-4 h-4 ${isSelected ? "text-blue-600" : "text-gray-400"}`} />
                              <span className="text-sm font-medium">{seniority.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}

                {currentStep === 3 && (
                  <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                    <div className="text-center mb-6">
                      <h3 className="text-xl font-bold text-gray-900">Template de message</h3>
                      <p className="text-gray-500">Choisissez votre approche de prospection</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {templates.map((template) => {
                        const isSelected = form.template === template.name;
                        return (
                          <motion.button key={template.name} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setForm({ ...form, template: template.name })} className={`p-5 border-2 rounded-2xl text-left transition-all ${isSelected ? "border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/20" : "border-gray-200 hover:border-gray-300 hover:shadow-md"}`}>
                            <div className="flex items-start justify-between mb-3">
                              <div className={`w-12 h-12 ${template.color} rounded-xl flex items-center justify-center`}><template.icon className="w-6 h-6 text-white" /></div>
                              {isSelected && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"><CheckCircle className="w-4 h-4 text-white" /></motion.div>}
                            </div>
                            <h4 className={`font-bold ${isSelected ? "text-blue-900" : "text-gray-900"}`}>{template.name}</h4>
                            <p className="text-sm text-gray-500 mt-1">{template.desc}</p>
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {currentStep === 4 && (
                  <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                    <div className="text-center mb-6">
                      <h3 className="text-xl font-bold text-gray-900">Paramètres avancés</h3>
                      <p className="text-gray-500">Configurez la cadence de votre campagne</p>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-gray-50 rounded-2xl p-5">
                        <label className="block text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-500" />Limite quotidienne</label>
                        <div className="flex items-center justify-center">
                          <div className="relative">
                            <input type="number" value={form.dailyLimit} onChange={(e) => setForm({ ...form, dailyLimit: parseInt(e.target.value) || 0 })} className="w-24 text-center text-3xl font-bold text-gray-900 bg-transparent border-b-2 border-gray-300 focus:border-blue-500 focus:outline-none py-2" />
                            <span className="absolute right-0 bottom-3 text-sm text-gray-400">/jour</span>
                          </div>
                        </div>
                        <input type="range" min="5" max="100" value={form.dailyLimit} onChange={(e) => setForm({ ...form, dailyLimit: parseInt(e.target.value) })} className="w-full mt-4 accent-blue-600" />
                      </div>
                      <div className="bg-gray-50 rounded-2xl p-5">
                        <label className="block text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-blue-500" />Délai de relance</label>
                        <div className="flex items-center justify-center">
                          <div className="relative">
                            <input type="number" value={form.followUpDays} onChange={(e) => setForm({ ...form, followUpDays: parseInt(e.target.value) || 0 })} className="w-24 text-center text-3xl font-bold text-gray-900 bg-transparent border-b-2 border-gray-300 focus:border-blue-500 focus:outline-none py-2" />
                            <span className="absolute right-0 bottom-3 text-sm text-gray-400">jours</span>
                          </div>
                        </div>
                        <input type="range" min="1" max="14" value={form.followUpDays} onChange={(e) => setForm({ ...form, followUpDays: parseInt(e.target.value) })} className="w-full mt-4 accent-blue-600" />
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-5 border border-blue-100">
                      <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-600" />Récapitulatif</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2"><span className="text-gray-500">Nom:</span><span className="font-medium text-gray-900">{form.name || "—"}</span></div>
                        <div className="flex items-center gap-2"><span className="text-gray-500">Cible:</span><span className="font-medium text-gray-900">{form.target || "—"}</span></div>
                        <div className="flex items-center gap-2"><span className="text-gray-500">Template:</span><span className="font-medium text-gray-900">{form.template || "—"}</span></div>
                        <div className="flex items-center gap-2"><span className="text-gray-500">Limite:</span><span className="font-medium text-gray-900">{form.dailyLimit} / jour</span></div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Boutons de navigation */}
              <div className="flex justify-between pt-6 mt-6 border-t border-gray-100">
                <button onClick={prevStep} disabled={currentStep === 1} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-colors ${currentStep === 1 ? "text-gray-300 cursor-not-allowed" : "text-gray-600 hover:bg-gray-100"}`}><ChevronLeft className="w-5 h-5" />Précédent</button>
                {currentStep < 4 ? (
                  <button onClick={nextStep} disabled={currentStep === 1 && !form.name.trim()} className={`flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/30 transition-all ${currentStep === 1 && !form.name.trim() ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-700 hover:shadow-xl"}`}>Suivant<ChevronRight className="w-5 h-5" /></button>
                ) : (
                  <button onClick={createCampaign} className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg shadow-purple-500/30 hover:shadow-xl transition-all"><Rocket className="w-5 h-5" />Créer la campagne</button>
                )}
              </div>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
}
