"use client";

import React, { useState, useEffect, useRef } from "react";
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
  MapPin, Building2, UserCircle, Send, Bell, LayoutGrid, List, MousePointerClick,
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
  objective?: string;
  seniority?: string[];
  dailyLimit?: number;
  followUpDays?: number;
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
  paused: { label: "En pause", color: "text-red-700", bgColor: "bg-red-100", borderColor: "border-red-200", icon: Pause },
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

const statusOptions = [
  { value: "all", label: "Tous les statuts", color: "bg-purple-500" },
  { value: "active", label: "Actives", color: "bg-green-500" },
  { value: "paused", label: "En pause", color: "bg-red-500" },
  { value: "draft", label: "Brouillons", color: "bg-slate-400" },
  { value: "completed", label: "Terminées", color: "bg-blue-500" },
];

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CampaignForm>(emptyForm);
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isHovered, setIsHovered] = useState<number | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { 
    setMounted(true); 
    fetchCampaigns();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function fetchCampaigns() {
    try {
      const response = await fetch('/api/campaigns');
      const data = await response.json();
      if (data.success) {
        // Mapper les données API au format Campaign
        const mappedCampaigns: Campaign[] = data.campaigns.map((c: any) => ({
          id: c.id,
          name: c.name,
          status: c.status,
          target: c.target_role || c.target || "Non défini",
          template: c.template || "Premier contact",
          startDate: new Date(c.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
          contacted: c.contacted || 0,
          replied: c.replied || 0,
          clicked: c.clicked || 0,
          converted: c.converted || 0,
          description: c.description,
          industry: c.industry,
          location: c.location,
          companySize: c.company_size,
          objective: c.objective || '',
          seniority: c.seniority ? c.seniority.split(',') : [],
          dailyLimit: c.daily_limit || 20,
          followUpDays: c.follow_up_days || 3,
        }));
        setCampaigns(mappedCampaigns);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  }

  const toggleStatus = async (id: number) => {
    const campaign = campaigns.find(c => c.id === id);
    if (!campaign) return;
    const newStatus = campaign.status === "active" ? "paused" : campaign.status === "paused" ? "active" : campaign.status === "draft" ? "active" : campaign.status;
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setCampaigns((prev) => prev.map((c) => c.id === id ? { ...c, status: newStatus as Campaign['status'] } : c));
        if (selected?.id === id) setSelected({ ...selected, status: newStatus as Campaign['status'] });
      }
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const deleteCampaign = async (id: number) => {
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCampaigns((prev) => prev.filter((c) => c.id !== id));
        if (selected?.id === id) setSelected(null);
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
    }
  };

  const duplicateCampaign = async (campaign: Campaign) => {
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${campaign.name} (copie)`,
          status: 'draft',
          target: campaign.target,
          template: campaign.template,
          description: campaign.description,
          industry: campaign.industry,
          location: campaign.location,
          company_size: campaign.companySize,
          objective: campaign.objective,
          seniority: campaign.seniority?.join(',') || '',
          daily_limit: campaign.dailyLimit,
          follow_up_days: campaign.followUpDays,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const c = data.campaign;
        const newCampaign: Campaign = {
          id: c.id,
          name: c.name,
          status: c.status,
          target: c.target_role || c.target || "Non défini",
          template: c.template || "Premier contact",
          startDate: new Date(c.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
          contacted: 0, replied: 0, clicked: 0, converted: 0,
          description: c.description,
          industry: c.industry,
          location: c.location,
          companySize: c.company_size,
          objective: c.objective || '',
          seniority: c.seniority ? c.seniority.split(',') : [],
          dailyLimit: c.daily_limit || 20,
          followUpDays: c.follow_up_days || 3,
        };
        setCampaigns((prev) => [newCampaign, ...prev]);
      }
    } catch (error) {
      console.error('Error duplicating campaign:', error);
    }
  };

  const createCampaign = async () => {
    if (!form.name.trim()) return;
    try {
      if (editingCampaign) {
        // Mode édition : PUT
        const res = await fetch(`/api/campaigns/${editingCampaign.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            description: form.description || '',
            target: form.target || '',
            target_role: form.target || '',
            template: form.template || '',
            industry: form.industry || '',
            location: form.location || '',
            company_size: form.companySize || '',
            objective: form.objective || '',
            seniority: form.seniority.length > 0 ? form.seniority.join(',') : '',
            daily_limit: form.dailyLimit || 20,
            follow_up_days: form.followUpDays || 3,
          }),
        });
        if (!res.ok) {
          const errText = await res.text();
          console.error('PUT error status:', res.status, errText);
        } else {
          const data = await res.json();
          if (data.success) {
            // Re-fetch pour garantir la synchro avec la DB
            await fetchCampaigns();
            if (selected?.id === editingCampaign.id) {
              const c = data.campaign;
              // Mapping complet comme dans fetchCampaigns
              setSelected({
                ...editingCampaign,
                id: c.id,
                name: c.name,
                status: c.status,
                target: c.target_role || c.target || 'Non défini',
                template: c.template || 'Premier contact',
                startDate: new Date(c.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
                contacted: c.contacted || 0,
                replied: c.replied || 0,
                clicked: c.clicked || 0,
                converted: c.converted || 0,
                description: c.description || '',
                industry: c.industry || '',
                location: c.location || '',
                companySize: c.company_size || '',
                objective: c.objective || '',
                seniority: c.seniority ? c.seniority.split(',') : [],
                dailyLimit: c.daily_limit || 20,
                followUpDays: c.follow_up_days || 3,
              });
            }
          } else {
            console.error('PUT failed:', res.status, JSON.stringify(data));
          }
        }
      } else {
        // Mode création : POST
        const res = await fetch('/api/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            status: 'draft',
            target: form.target || '',
            template: form.template || '',
            description: form.description,
            industry: form.industry === 'Toutes industries' ? '' : form.industry,
            location: form.location === 'France entière' ? '' : form.location,
            company_size: form.companySize === 'Toutes tailles' ? '' : form.companySize,
            objective: form.objective || '',
            seniority: form.seniority.length > 0 ? form.seniority.join(',') : '',
            daily_limit: form.dailyLimit,
            follow_up_days: form.followUpDays,
          }),
        });
        const data = await res.json();
        if (data.success) {
          const c = data.campaign;
          const newCampaign: Campaign = {
            id: c.id,
            name: c.name,
            status: c.status,
            target: c.target_role || c.target || "À définir",
            template: c.template || "Premier contact",
            startDate: new Date(c.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
            contacted: 0, replied: 0, clicked: 0, converted: 0,
            description: c.description,
            industry: c.industry,
            location: c.location,
            companySize: c.company_size,
            objective: c.objective || '',
            seniority: c.seniority ? c.seniority.split(',') : [],
            dailyLimit: c.daily_limit || 20,
            followUpDays: c.follow_up_days || 3,
          };
          setCampaigns((prev) => [newCampaign, ...prev]);
        }
      }
    } catch (error) {
      console.error('Error saving campaign:', error);
    }
    setForm(emptyForm);
    setShowModal(false);
    setEditingCampaign(null);
    setCurrentStep(1);
  };

  const openModal = () => { setForm(emptyForm); setEditingCampaign(null); setCurrentStep(1); setShowModal(true); };
  const closeModal = () => { setForm(emptyForm); setEditingCampaign(null); setShowModal(false); setCurrentStep(1); };
  const openEditModal = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setForm({
      name: campaign.name,
      description: campaign.description || '',
      target: campaign.target || '',
      template: campaign.template || '',
      industry: campaign.industry || 'Toutes industries',
      location: campaign.location || 'France entière',
      companySize: campaign.companySize || 'Toutes tailles',
      dailyLimit: campaign.dailyLimit || 20,
      followUpDays: campaign.followUpDays || 3,
      objective: campaign.objective || '',
      seniority: campaign.seniority || [],
    });
    setCurrentStep(1);
    setShowModal(true);
  };
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
    { label: "Total clics", value: campaigns.reduce((s, c) => s + c.clicked, 0), icon: MousePointerClick, color: "from-yellow-400 to-amber-500", bgColor: "bg-yellow-50", textColor: "text-yellow-600" },
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
      {/* Header simple sans bande */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="w-8 h-8 text-blue-600" />
            Campagnes
          </h1>
          <p className="text-gray-600 mt-1">Gérez vos campagnes de prospection</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg text-sm border border-green-200">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="font-medium text-green-700">{campaigns.filter(c => c.status === "active").length} actives</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={openModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm shadow-md hover:shadow-lg transition-shadow"
          >
            <Plus className="w-4 h-4" />
            Nouvelle
          </motion.button>
        </div>
      </div>

      {/* Stats Cards compactes - icônes colorées sur fond blanc */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
              <Card className="overflow-hidden border border-gray-100 shadow-md hover:shadow-lg transition-shadow bg-white">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                      <Icon className={`w-5 h-5 ${stat.textColor}`} />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900">{stat.value}</p>
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
          {/* Custom Dropdown with Status Indicators */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-3 pl-4 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-blue-300 transition-all shadow-sm w-44"
            >
              <span className={`w-2.5 h-2.5 rounded-full ${statusOptions.find(s => s.value === filterStatus)?.color}`}></span>
              <span>{filterStatus === 'all' ? 'Tous les statuts' : statusOptions.find(s => s.value === filterStatus)?.label}</span>
            </button>
            <div className="absolute right-2.5 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            
            {dropdownOpen && (
              <div className="absolute top-full right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                {statusOptions.map((status) => (
                  <button
                    key={status.value}
                    onClick={() => { setFilterStatus(status.value); setDropdownOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <span className={`w-2 h-2 rounded-full ${status.color}`}></span>
                    <span>{status.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
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
                          <div className={`w-1.5 ${campaign.status === 'active' ? 'bg-green-500' : campaign.status === 'paused' ? 'bg-red-500' : campaign.status === 'draft' ? 'bg-slate-400' : 'bg-blue-500'}`} />
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
                    <div className={`h-1.5 ${campaign.status === 'active' ? 'bg-green-500' : campaign.status === 'paused' ? 'bg-red-500' : campaign.status === 'draft' ? 'bg-slate-400' : 'bg-blue-500'}`} />
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
              {filteredCampaigns.length === 0 && (
                <div className="col-span-2 text-center py-12">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"><Search className="w-10 h-10 text-gray-400" /></div>
                  <p className="text-gray-500">Aucune campagne trouvée</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Panel de détails */}
        <AnimatePresence>
          {selected && (
            <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} className="w-[420px] shrink-0">
              <Card className="border-0 shadow-xl sticky top-6 overflow-hidden max-h-[calc(100vh-120px)] flex flex-col">
                <div className={`h-2 ${selected.status === 'active' ? 'bg-green-500' : selected.status === 'paused' ? 'bg-red-500' : selected.status === 'draft' ? 'bg-slate-400' : 'bg-blue-500'}`} />
                <CardHeader className="pb-4 shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl ${statusConfig[selected.status].bgColor} flex items-center justify-center`}>
                        {React.createElement(statusConfig[selected.status].icon, { className: `w-6 h-6 ${statusConfig[selected.status].color}` })}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{selected.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`${statusConfig[selected.status].bgColor} ${statusConfig[selected.status].color} border-0`}>{statusConfig[selected.status].label}</Badge>
                          <span className="text-xs text-gray-400 flex items-center gap-1"><Calendar className="w-3 h-3" />{selected.startDate}</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4 overflow-y-auto flex-1 pb-4">
                  {/* Two-column layout for upper details */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Left column - Description + Ciblage */}
                    <div className="space-y-3">
                      {/* Description */}
                      {selected.description && (
                        <div>
                          <h4 className="text-[10px] font-semibold text-gray-500 uppercase mb-1 flex items-center gap-1"><MessageSquare className="w-3 h-3" />Description</h4>
                          <div className="bg-gray-50 rounded-lg p-2">
                            <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{selected.description}</p>
                          </div>
                        </div>
                      )}

                      {/* Ciblage */}
                      <div>
                        <h4 className="text-[10px] font-semibold text-gray-500 uppercase mb-1 flex items-center gap-1"><Target className="w-3 h-3" />Ciblage</h4>
                        <div className="bg-white border border-gray-100 rounded-lg p-2 space-y-1.5">
                          <div className="flex items-center gap-2 text-xs">
                            <div className="w-5 h-5 rounded bg-blue-50 flex items-center justify-center shrink-0"><UserCircle className="w-3 h-3 text-blue-500" /></div>
                            <div className="min-w-0"><p className="text-[9px] text-gray-400 uppercase">Profil</p><p className="font-medium text-gray-800 truncate">{selected.target || 'Non défini'}</p></div>
                          </div>
                          {selected.industry && (
                            <div className="flex items-center gap-2 text-xs">
                              <div className="w-5 h-5 rounded bg-purple-50 flex items-center justify-center shrink-0"><Building2 className="w-3 h-3 text-purple-500" /></div>
                              <div className="min-w-0"><p className="text-[9px] text-gray-400 uppercase">Industrie</p><p className="font-medium text-gray-800 truncate">{selected.industry}</p></div>
                            </div>
                          )}
                          {selected.location && (
                            <div className="flex items-center gap-2 text-xs">
                              <div className="w-5 h-5 rounded bg-green-50 flex items-center justify-center shrink-0"><MapPin className="w-3 h-3 text-green-500" /></div>
                              <div className="min-w-0"><p className="text-[9px] text-gray-400 uppercase">Localisation</p><p className="font-medium text-gray-800 truncate">{selected.location}</p></div>
                            </div>
                          )}
                          {selected.companySize && (
                            <div className="flex items-center gap-2 text-xs">
                              <div className="w-5 h-5 rounded bg-orange-50 flex items-center justify-center shrink-0"><Users className="w-3 h-3 text-orange-500" /></div>
                              <div className="min-w-0"><p className="text-[9px] text-gray-400 uppercase">Taille</p><p className="font-medium text-gray-800 truncate">{selected.companySize}</p></div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right column - Objectif, Niveau, Template, Parametres */}
                    <div className="space-y-3">
                      {/* Objectif */}
                      {selected.objective && (
                        <div>
                          <h4 className="text-[10px] font-semibold text-gray-500 uppercase mb-1 flex items-center gap-1"><Compass className="w-3 h-3" />Objectif</h4>
                          <div className="bg-indigo-50 rounded-md px-2 py-1 flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-indigo-500" />
                            <span className="text-xs font-medium text-indigo-700 truncate">{selected.objective}</span>
                          </div>
                        </div>
                      )}

                      {/* Niveau hiérarchique */}
                      {selected.seniority && selected.seniority.length > 0 && selected.seniority[0] !== '' && (
                        <div>
                          <h4 className="text-[10px] font-semibold text-gray-500 uppercase mb-1 flex items-center gap-1"><Crown className="w-3 h-3" />Niveau</h4>
                          <div className="flex flex-wrap gap-1">
                            {selected.seniority.map((s) => (
                              <Badge key={s} variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0">{s}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Template */}
                      {selected.template && (
                        <div>
                          <h4 className="text-[10px] font-semibold text-gray-500 uppercase mb-1 flex items-center gap-1"><Mail className="w-3 h-3" />Template</h4>
                          <div className="bg-blue-50 rounded-md px-2 py-1 flex items-center gap-1.5">
                            <Send className="w-3 h-3 text-blue-500" />
                            <span className="text-xs font-medium text-blue-700 truncate">{selected.template}</span>
                          </div>
                        </div>
                      )}

                      {/* Paramètres */}
                      <div>
                        <h4 className="text-[10px] font-semibold text-gray-500 uppercase mb-1 flex items-center gap-1"><Settings className="w-3 h-3" />Paramètres</h4>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div className="bg-gray-50 rounded-lg p-1.5 text-center">
                            <p className="text-[9px] text-gray-400 uppercase">Limite/jour</p>
                            <p className="text-base font-bold text-gray-800">{selected.dailyLimit || 20}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-1.5 text-center">
                            <p className="text-[9px] text-gray-400 uppercase">Relance</p>
                            <p className="text-base font-bold text-gray-800">{selected.followUpDays || 3}<span className="text-xs font-normal text-gray-400">j</span></p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Statistiques - Full width below columns */}
                  <div className="pt-2">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-2"><BarChart3 className="w-4 h-4" />Statistiques</h4>
                    {/* 4 stats in one horizontal row */}
                    <div className="flex gap-3 mb-3">
                      <div className="flex-1 bg-blue-50 rounded-lg py-3 px-2 text-center">
                        <p className="text-xl font-bold text-blue-600 leading-tight">{selected.contacted}</p>
                        <p className="text-xs text-gray-500">Contactés</p>
                      </div>
                      <div className="flex-1 bg-purple-50 rounded-lg py-3 px-2 text-center">
                        <p className="text-xl font-bold text-purple-600 leading-tight">{selected.replied}</p>
                        <p className="text-xs text-gray-500">Réponses</p>
                      </div>
                      <div className="flex-1 bg-cyan-50 rounded-lg py-3 px-2 text-center">
                        <p className="text-xl font-bold text-cyan-600 leading-tight">{selected.clicked}</p>
                        <p className="text-xs text-gray-500">Clics</p>
                      </div>
                      <div className="flex-1 bg-green-50 rounded-lg py-3 px-2 text-center">
                        <p className="text-xl font-bold text-green-600 leading-tight">{selected.converted}</p>
                        <p className="text-xs text-gray-500">Conversions</p>
                      </div>
                    </div>
                    {/* Progress bars - full width */}
                    <div className="space-y-2">
                      {[
                        { label: "Taux de réponse", value: rate(selected.replied, selected.contacted), color: "bg-purple-500" },
                        { label: "Taux de clic", value: rate(selected.clicked, selected.contacted), color: "bg-cyan-500" },
                        { label: "Conversion", value: rate(selected.converted, selected.contacted), color: "bg-green-500" },
                      ].map((m) => (
                        <div key={m.label} className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 w-24 shrink-0">{m.label}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2.5"><div className={`h-2.5 rounded-full ${m.color} transition-all duration-500`} style={{ width: m.value }} /></div>
                          <span className="text-xs font-bold w-10 text-right">{m.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => duplicateCampaign(selected)}><Copy className="w-3.5 h-3.5 mr-1" />Dupliquer</Button>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs" onClick={() => openEditModal(selected)}><Edit3 className="w-3.5 h-3.5 mr-1" />Modifier</Button>
                    <Button variant="outline" size="sm" className="text-xs text-red-500 border-red-200 hover:bg-red-50" onClick={() => deleteCampaign(selected.id)}><Trash2 className="w-3.5 h-3.5 mr-1" />Supprimer</Button>
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Header avec bande colorée subtile */}
            <div className="border-b border-gray-100 bg-white border-t-4 border-t-blue-500 px-6 pt-6 pb-5">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center">
                    <Target className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{editingCampaign ? 'Modifier la campagne' : 'Nouvelle campagne'}</h2>
                    <p className="text-sm text-gray-500">{editingCampaign ? 'Modifiez les paramètres de votre campagne' : 'Configurez votre prospection en 4 étapes'}</p>
                  </div>
                </div>
                <button onClick={closeModal} className="w-9 h-9 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg flex items-center justify-center transition-colors"><X className="w-5 h-5" /></button>
              </div>
              {/* Stepper */}
              <div className="flex items-center justify-center gap-2">
                {[
                  { step: 1, label: "Général" },
                  { step: 2, label: "Ciblage" },
                  { step: 3, label: "Template" },
                  { step: 4, label: "Paramètres" },
                ].map(({ step, label }) => (
                  <div key={step} className="flex items-center">
                    <div className="flex flex-col items-center gap-1">
                      <motion.div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${currentStep === step ? "bg-blue-600 text-white shadow-md shadow-blue-200" : currentStep > step ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                        {currentStep > step ? <CheckCircle className="w-4 h-4" /> : step}
                      </motion.div>
                      <span className={`text-[10px] font-medium ${currentStep === step ? "text-blue-600" : currentStep > step ? "text-green-600" : "text-gray-400"}`}>{label}</span>
                    </div>
                    {step < 4 && <div className={`w-12 h-0.5 mx-1.5 mb-4 rounded-full transition-colors ${currentStep > step ? "bg-green-300" : "bg-gray-200"}`} />}
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
                          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                          <select value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} className="appearance-none w-full pl-12 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer hover:border-blue-300 transition-all">
                            {industries.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
                          </select>
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Localisation</label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                          <select value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="appearance-none w-full pl-12 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer hover:border-blue-300 transition-all">
                            {locations.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
                          </select>
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Taille d'entreprise</label>
                        <div className="relative">
                          <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                          <select value={form.companySize} onChange={(e) => setForm({ ...form, companySize: e.target.value })} className="appearance-none w-full pl-12 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer hover:border-blue-300 transition-all">
                            {companySizes.map((size) => <option key={size} value={size}>{size}</option>)}
                          </select>
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
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
                  <button onClick={createCampaign} className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg shadow-purple-500/30 hover:shadow-xl transition-all"><Rocket className="w-5 h-5" />{editingCampaign ? 'Enregistrer' : 'Créer la campagne'}</button>
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
