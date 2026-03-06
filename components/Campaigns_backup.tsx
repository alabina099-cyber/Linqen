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
  ChevronLeft, Globe, Briefcase, Clock, Mail, BarChart3, Filter, Search,
  MoreHorizontal, Edit3, Copy, Archive, Eye, MousePointerClick, Award,
  Crown, Star, Flame, Compass, MapPin, Building2, UserCircle, Send, Bell,
  BarChart2, PieChart, Activity, Layers, Grid3X3, List, LayoutGrid,
} from "lucide-react";

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
}

const initialCampaigns: Campaign[] = [
  {
    id: 1,
    name: "CTOs Tech Paris",
    status: "active",
    target: "CTO, VP Engineering - Île-de-France",
    template: "Premier contact",
    startDate: "01 Mar 2026",
    contacted: 142,
    replied: 28,
    clicked: 15,
    converted: 4,
  },
  {
    id: 2,
    name: "Fondateurs SaaS B2B",
    status: "active",
    target: "Founder, CEO - SaaS B2B - France",
    template: "Message de suivi",
    startDate: "20 Fév 2026",
    contacted: 89,
    replied: 18,
    clicked: 9,
    converted: 2,
  },
  {
    id: 3,
    name: "Directeurs Marketing",
    status: "paused",
    target: "CMO, Marketing Director - France",
    template: "Premier contact",
    startDate: "10 Fév 2026",
    contacted: 56,
    replied: 9,
    clicked: 4,
    converted: 1,
  },
  {
    id: 4,
    name: "Scale-ups Series A",
    status: "draft",
    target: "CEO, COO - Scale-up - Levée A",
    template: "Partage de lien",
    startDate: "—",
    contacted: 0,
    replied: 0,
    clicked: 0,
    converted: 0,
  },
];

const statusConfig = {
  active: { label: "Active", color: "text-green-700", bgColor: "bg-green-100", borderColor: "border-green-200", icon: Play },
  paused: { label: "En pause", color: "text-amber-700", bgColor: "bg-amber-100", borderColor: "border-amber-200", icon: Pause },
  draft: { label: "Brouillon", color: "text-slate-700", bgColor: "bg-slate-100", borderColor: "border-slate-200", icon: Edit3 },
  completed: { label: "Terminée", color: "text-blue-700", bgColor: "bg-blue-100", borderColor: "border-blue-200", icon: CheckCircle },
};

const templates = [
  "Premier contact",
  "Message de suivi",
  "Partage de lien",
  "Relance finale",
] as const;

interface CampaignForm {
  name: string;
  target: string;
  template: (typeof templates)[number] | "";
  dailyLimit: string;
  followUpDays: string;
  objective: string;
}

const emptyForm: CampaignForm = {
  name: "",
  target: "",
  template: "",
  dailyLimit: "",
  followUpDays: "",
  objective: "",
};

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

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleStatus = (id: number) => {
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status:
                c.status === "active"
                  ? "paused"
                  : c.status === "paused"
                  ? "active"
                  : c.status === "draft"
                  ? "active"
                  : c.status,
            }
          : c
      )
    );
  };

  const deleteCampaign = (id: number) => {
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const createCampaign = () => {
    if (!form.name.trim()) return;
    const newCampaign: Campaign = {
      id: Date.now(),
      name: form.name,
      status: "draft",
      target: form.target || "À définir",
      template: form.template || "Premier contact",
      startDate: "—",
      contacted: 0,
      replied: 0,
      clicked: 0,
      converted: 0,
    };
    setCampaigns((prev) => [...prev, newCampaign]);
    setForm(emptyForm);
    setShowModal(false);
  };

  const openModal = () => {
    setForm(emptyForm);
    setShowModal(true);
  };

  const closeModal = () => {
    setForm(emptyForm);
    setShowModal(false);
  };

  const rate = (a: number, b: number) =>
    b === 0 ? "0%" : `${Math.round((a / b) * 100)}%`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campagnes</h1>
          <p className="text-gray-600 mt-1">
            Créez et gérez vos campagnes de prospection
          </p>
        </div>
        <Button
          onClick={openModal}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle campagne
        </Button>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Campagnes actives",
            value: campaigns.filter((c) => c.status === "active").length,
            icon: Play,
            color: "text-green-600 bg-green-50",
          },
          {
            label: "Total contactés",
            value: campaigns.reduce((s, c) => s + c.contacted, 0),
            icon: Users,
            color: "text-blue-600 bg-blue-50",
          },
          {
            label: "Total réponses",
            value: campaigns.reduce((s, c) => s + c.replied, 0),
            icon: MessageSquare,
            color: "text-purple-600 bg-purple-50",
          },
          {
            label: "Total conversions",
            value: campaigns.reduce((s, c) => s + c.converted, 0),
            icon: TrendingUp,
            color: "text-orange-600 bg-orange-50",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex gap-6">
        {/* Campaign list */}
        <div className="flex-1 space-y-4">
          {campaigns.map((campaign) => (
            <Card
              key={campaign.id}
              onClick={() => setSelected(campaign)}
              className={`cursor-pointer hover:shadow-md transition-all ${
                selected?.id === campaign.id ? "ring-2 ring-blue-500" : ""
              }`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {campaign.name}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                        <Target className="w-3 h-3" />
                        {campaign.target}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusConfig[campaign.status].color}>
                      {statusConfig[campaign.status].label}
                    </Badge>
                    <div className="flex gap-1">
                      {(campaign.status === "active" ||
                        campaign.status === "paused") && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStatus(campaign.id);
                          }}
                          title={
                            campaign.status === "active"
                              ? "Mettre en pause"
                              : "Reprendre"
                          }
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          {campaign.status === "active" ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      {campaign.status === "draft" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStatus(campaign.id);
                          }}
                          title="Lancer la campagne"
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCampaign(campaign.id);
                        }}
                        title="Supprimer"
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 mt-4">
                  {[
                    {
                      label: "Contactés",
                      value: campaign.contacted,
                      color: "text-blue-600",
                    },
                    {
                      label: "Réponses",
                      value: `${campaign.replied} (${rate(
                        campaign.replied,
                        campaign.contacted
                      )})`,
                      color: "text-purple-600",
                    },
                    {
                      label: "Clics",
                      value: `${campaign.clicked} (${rate(
                        campaign.clicked,
                        campaign.contacted
                      )})`,
                      color: "text-cyan-600",
                    },
                    {
                      label: "Convertis",
                      value: `${campaign.converted} (${rate(
                        campaign.converted,
                        campaign.contacted
                      )})`,
                      color: "text-green-600",
                    },
                  ].map((m) => (
                    <div
                      key={m.label}
                      className="text-center p-2 bg-gray-50 rounded-lg"
                    >
                      <p className={`text-lg font-bold ${m.color}`}>
                        {m.value}
                      </p>
                      <p className="text-xs text-gray-500">{m.label}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Calendar className="w-3 h-3" />
                    Début : {campaign.startDate}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <MessageSquare className="w-3 h-3" />
                    Template : {campaign.template}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Detail panel */}
        {selected && (
          <Card className="w-80 shrink-0 h-fit sticky top-6">
            <CardHeader className="border-b pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{selected.name}</CardTitle>
                <button
                  onClick={() => setSelected(null)}
                  aria-label="Fermer"
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <Badge className={statusConfig[selected.status].color}>
                {statusConfig[selected.status].label}
              </Badge>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                  Ciblage
                </p>
                <p className="text-sm text-gray-800">{selected.target}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                  Template
                </p>
                <p className="text-sm text-gray-800">{selected.template}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                  Performance
                </p>
                <div className="space-y-2">
                  {[
                    {
                      label: "Taux de réponse",
                      value: rate(selected.replied, selected.contacted),
                      color: "bg-purple-500",
                    },
                    {
                      label: "Taux de clic",
                      value: rate(selected.clicked, selected.contacted),
                      color: "bg-cyan-500",
                    },
                    {
                      label: "Taux de conversion",
                      value: rate(selected.converted, selected.contacted),
                      color: "bg-green-500",
                    },
                  ].map((m) => (
                    <div key={m.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600">{m.label}</span>
                        <span className="font-medium">{m.value}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${m.color}`}
                          style={{ width: m.value }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm">
                <Settings className="w-4 h-4 mr-2" />
                Modifier la campagne
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create modal rendered via portal into document.body */}
      {mounted &&
        showModal &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60" />
            {/* Modal content */}
            <Card className="relative w-full max-w-lg bg-white shadow-xl">
              <CardHeader className="border-b pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle>Nouvelle campagne</CardTitle>
                  <button
                    onClick={closeModal}
                    aria-label="Fermer"
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de la campagne *
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    placeholder="Ex: CEOs SaaS Paris"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ciblage
                  </label>
                  <input
                    value={form.target}
                    onChange={(e) =>
                      setForm({ ...form, target: e.target.value })
                    }
                    placeholder="Ex: CEO, Founder - SaaS - France"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label htmlFor="campaign-template" className="block text-sm font-medium text-gray-700 mb-1">
                    Template de message
                  </label>
                  <select
                    id="campaign-template"
                    aria-label="Template de message"
                    value={form.template}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        template: e.target.value as CampaignForm["template"],
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="" disabled>
                      Sélectionner un template
                    </option>
                    {templates.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="campaign-limit" className="block text-sm font-medium text-gray-700 mb-1">
                      Limite / jour
                    </label>
                    <input
                      id="campaign-limit"
                      aria-label="Limite par jour"
                      type="number"
                      value={form.dailyLimit}
                      onChange={(e) =>
                        setForm({ ...form, dailyLimit: e.target.value })
                      }
                      placeholder="Ex: 20"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="campaign-followup" className="block text-sm font-medium text-gray-700 mb-1">
                      Relance après (jours)
                    </label>
                    <input
                      id="campaign-followup"
                      aria-label="Relance après (jours)"
                      type="number"
                      value={form.followUpDays}
                      onChange={(e) =>
                        setForm({ ...form, followUpDays: e.target.value })
                      }
                      placeholder="Ex: 3"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Objectif
                  </label>
                  <input
                    value={form.objective}
                    onChange={(e) =>
                      setForm({ ...form, objective: e.target.value })
                    }
                    placeholder="Ex: Générer 10 démos en 30 jours"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={closeModal}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={createCampaign}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Créer la campagne
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>,
          document.body
        )}
    </div>
  );
}
