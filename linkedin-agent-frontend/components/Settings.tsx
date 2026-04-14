"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Switch } from "./ui/switch";
import { Slider } from "./ui/slider";
import { Separator } from "./ui/separator";
import { ProgressBar } from "./ui/progress-bar";
import LinkedInAccount from "./LinkedInAccount";
import {
  User,
  Linkedin,
  Bell,
  Shield,
  Zap,
  Target,
  MessageSquare,
  Clock,
  Database,
  Globe,
  Palette,
  CreditCard,
  Key,
  Smartphone,
  Mail,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  LogOut,
  Trash2,
  Download,
  ExternalLink,
  ChevronRight,
  Save,
  Bot,
  Calendar,
  Briefcase,
  Users,
  Settings2,
  Webhook,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  Sparkles,
  Sun,
  Moon,
  Monitor,
  Type,
  Layers,
  ChevronDown
} from "lucide-react";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("account");
  const [saved, setSaved] = useState(false);
  
  // Account Settings
  const [account, setAccount] = useState({
    name: "Dorra Boucharbia",
    email: "dorraboucharbia@gmail.com",
    company: "StackReach",
    role: "Admin",
    avatar: "DB",
    linkedInConnected: true,
    linkedInEmail: "dorraboucharbia@gmail.com",
    lastSync: "Il y a 5 min",
  });

  // Prospection Limits
  const [limits, setLimits] = useState({
    dailyConnections: 20,
    dailyMessages: 50,
    dailyProfileViews: 100,
    weeklyInvitations: 100,
    autoPauseOnLimit: true,
    respectLinkedInLimits: true,
  });

  // Automation Settings
  const [automation, setAutomation] = useState({
    minDelayBetweenActions: 30,
    maxDelayBetweenActions: 120,
    workingHoursStart: "09:00",
    workingHoursEnd: "18:00",
    workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    timezone: "Europe/Paris",
    randomizeDelays: true,
    simulateHumanBehavior: true,
    autoFollowUp: true,
    followUpDelay: 3,
    maxFollowUps: 2,
  });

  // AI Settings
  const [aiSettings, setAiSettings] = useState({
    aiEnabled: true,
    aiModel: "gpt-4",
    autoReplyEnabled: false,
    autoReplyConfidence: 75,
    personalizationLevel: 80,
    tone: "professional",
    autoDetectLanguage: true,
    sentimentAnalysis: true,
    smartFollowUp: true,
  });

  // Default Targeting
  const [targeting, setTargeting] = useState({
    defaultIndustry: "Technologie / SaaS",
    defaultCompanySize: "11-50 employés",
    defaultLocation: "France",
    defaultSeniority: "Cadre / Directeur",
    defaultFunction: "IT / Engineering / Marketing",
    excludeCompetitors: true,
    excludeExistingCustomers: true,
    onlySecondDegree: false,
    premiumOnly: false,
  });

  // Dropdown open states
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [industryDropdownOpen, setIndustryDropdownOpen] = useState(false);
  const [sizeDropdownOpen, setSizeDropdownOpen] = useState(false);
  const [seniorityDropdownOpen, setSeniorityDropdownOpen] = useState(false);
  const [functionDropdownOpen, setFunctionDropdownOpen] = useState(false);
  const [aiModelDropdownOpen, setAiModelDropdownOpen] = useState(false);
  const [toneDropdownOpen, setToneDropdownOpen] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState({
    emailDailySummary: true,
    emailWeeklyReport: true,
    emailNewReply: true,
    emailNewConversion: true,
    emailLimitWarning: true,
    inAppNotifications: true,
    browserNotifications: false,
    mobilePush: false,
    slackWebhook: "",
    discordWebhook: "",
  });

  // Integrations
  const [integrations, setIntegrations] = useState({
    crm: { type: "hubspot", connected: false, apiKey: "" },
    calendar: { type: "google", connected: true, email: "dorraboucharbia@gmail.com" },
    zapier: { connected: false },
    slack: { connected: false, webhook: "" },
    googleSheets: { connected: false, sheetId: "" },
  });

  // Security
  const [security, setSecurity] = useState({
    twoFactorEnabled: false,
    apiKeyVisible: false,
    apiKey: "sk_live_51NxXXXXXXXXXXXXXXXXXXXXX",
    sessionTimeout: 30,
    ipWhitelist: "",
    loginAlerts: true,
  });

  // Appearance
  const [appearance, setAppearance] = useState({
    theme: "light",
    language: "fr",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "24h",
    compactMode: false,
  });

  // Billing
  const [billing] = useState({
    plan: "Pro",
    status: "active",
    renewDate: "15 Mars 2026",
    seats: 3,
    usedSeats: 2,
    monthlyContacts: 5000,
    usedContacts: 3247,
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const dropdowns = [
        'role-dropdown', 'industry-dropdown', 'size-dropdown', 
        'seniority-dropdown', 'function-dropdown', 'ai-model-dropdown', 'tone-dropdown'
      ];
      
      dropdowns.forEach((id, index) => {
        const dropdown = document.getElementById(id);
        if (dropdown && !dropdown.contains(event.target as Node)) {
          const setters = [
            setRoleDropdownOpen, setIndustryDropdownOpen, setSizeDropdownOpen,
            setSeniorityDropdownOpen, setFunctionDropdownOpen, setAiModelDropdownOpen, setToneDropdownOpen
          ];
          setters[index](false);
        }
      });
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      {/* Header créatif */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.15),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.1),transparent_50%)]" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Settings2 className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Paramètres</h1>
              <p className="text-slate-400 mt-1">Configurez votre agent LinkedIn et vos préférences</p>
            </div>
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button 
              onClick={handleSave}
              className={`px-6 py-2.5 rounded-xl font-semibold shadow-lg transition-all ${saved ? "bg-gradient-to-r from-emerald-500 to-green-500" : "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"}`}
            >
              {saved ? (
                <><Check className="w-4 h-4 mr-2" /> Enregistré</>
              ) : (
                <><Save className="w-4 h-4 mr-2" /> Enregistrer</>
              )}
            </Button>
          </motion.div>
        </div>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-9 gap-2 bg-gray-100/50 p-2 rounded-2xl border border-gray-200/50 h-auto">
          <TabsTrigger value="account" className="text-xs sm:text-sm rounded-xl border-2 border-gray-200 bg-white text-gray-600 hover:border-gray-300 data-[state=active]:border-transparent data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all px-2 sm:px-3 py-2"><User className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">Compte</span><span className="sm:hidden">Compte</span></TabsTrigger>
          <TabsTrigger value="prospection" className="text-xs sm:text-sm rounded-xl border-2 border-gray-200 bg-white text-gray-600 hover:border-gray-300 data-[state=active]:border-transparent data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all px-2 sm:px-3 py-2"><Target className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">Prospection</span><span className="sm:hidden">Prospect</span></TabsTrigger>
          <TabsTrigger value="automation" className="text-xs sm:text-sm rounded-xl border-2 border-gray-200 bg-white text-gray-600 hover:border-gray-300 data-[state=active]:border-transparent data-[state=active]:bg-gradient-to-br data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all px-2 sm:px-3 py-2"><Zap className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">Automatisation</span><span className="sm:hidden">Auto</span></TabsTrigger>
          <TabsTrigger value="ai" className="text-xs sm:text-sm rounded-xl border-2 border-gray-200 bg-white text-gray-600 hover:border-gray-300 data-[state=active]:border-transparent data-[state=active]:bg-gradient-to-br data-[state=active]:from-pink-500 data-[state=active]:to-rose-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all px-2 sm:px-3 py-2"><Bot className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />IA</TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs sm:text-sm rounded-xl border-2 border-gray-200 bg-white text-gray-600 hover:border-gray-300 data-[state=active]:border-transparent data-[state=active]:bg-gradient-to-br data-[state=active]:from-cyan-500 data-[state=active]:to-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all px-2 sm:px-3 py-2"><Bell className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">Notifications</span><span className="sm:hidden">Notif</span></TabsTrigger>
          <TabsTrigger value="integrations" className="text-xs sm:text-sm rounded-xl border-2 border-gray-200 bg-white text-gray-600 hover:border-gray-300 data-[state=active]:border-transparent data-[state=active]:bg-gradient-to-br data-[state=active]:from-indigo-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all px-2 sm:px-3 py-2"><Webhook className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">Intégrations</span><span className="sm:hidden">Intég</span></TabsTrigger>
          <TabsTrigger value="security" className="text-xs sm:text-sm rounded-xl border-2 border-gray-200 bg-white text-gray-600 hover:border-gray-300 data-[state=active]:border-transparent data-[state=active]:bg-gradient-to-br data-[state=active]:from-emerald-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all px-2 sm:px-3 py-2"><Shield className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">Sécurité</span><span className="sm:hidden">Secu</span></TabsTrigger>
          <TabsTrigger value="appearance" className="text-xs sm:text-sm rounded-xl border-2 border-gray-200 bg-white text-gray-600 hover:border-gray-300 data-[state=active]:border-transparent data-[state=active]:bg-gradient-to-br data-[state=active]:from-violet-500 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all px-2 sm:px-3 py-2"><Palette className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">Affichage</span><span className="sm:hidden">Affich</span></TabsTrigger>
          <TabsTrigger value="billing" className="text-xs sm:text-sm rounded-xl border-2 border-gray-200 bg-white text-gray-600 hover:border-gray-300 data-[state=active]:border-transparent data-[state=active]:bg-gradient-to-br data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all px-2 sm:px-3 py-2"><CreditCard className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">Facturation</span><span className="sm:hidden">Fact</span></TabsTrigger>
        </TabsList>

        {/* ACCOUNT TAB */}
        <TabsContent value="account" className="space-y-6">
          {/* LinkedIn Connection — Real Component */}
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="h-1 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600" />
            <CardContent className="p-0">
              <div className="p-6">
                <LinkedInAccount />
              </div>
            </CardContent>
          </Card>

        </TabsContent>

        {/* PROSPECTION TAB */}
        <TabsContent value="prospection" className="space-y-6">
          {/* Daily Limits */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                Limites Quotidiennes
              </CardTitle>
              <CardDescription>Définissez vos limites pour rester dans les bonnes pratiques LinkedIn</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invitations / jour: <span className="text-blue-600 font-bold">{limits.dailyConnections}</span>
                  </label>
                  <Slider
                    value={[limits.dailyConnections]}
                    onValueChange={([v]: number[]) => setLimits({ ...limits, dailyConnections: v })}
                    max={100}
                    min={5}
                    step={5}
                  />
                  <p className="text-xs text-gray-500 mt-1">Recommandé: 20-30 pour un compte établi</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Messages / jour: <span className="text-blue-600 font-bold">{limits.dailyMessages}</span>
                  </label>
                  <Slider
                    value={[limits.dailyMessages]}
                    onValueChange={([v]: number[]) => setLimits({ ...limits, dailyMessages: v })}
                    max={200}
                    min={10}
                    step={10}
                  />
                  <p className="text-xs text-gray-500 mt-1">Recommandé: 50-100</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Visites de profil / jour: <span className="text-blue-600 font-bold">{limits.dailyProfileViews}</span>
                  </label>
                  <Slider
                    value={[limits.dailyProfileViews]}
                    onValueChange={([v]: number[]) => setLimits({ ...limits, dailyProfileViews: v })}
                    max={500}
                    min={50}
                    step={10}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invitations / semaine: <span className="text-blue-600 font-bold">{limits.weeklyInvitations}</span>
                  </label>
                  <Slider
                    value={[limits.weeklyInvitations]}
                    onValueChange={([v]: number[]) => setLimits({ ...limits, weeklyInvitations: v })}
                    max={200}
                    min={20}
                    step={10}
                  />
                  <p className="text-xs text-gray-500 mt-1">Limite LinkedIn: 100-200/semaine</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Pause automatique aux limites</p>
                    <p className="text-sm text-gray-500">Arrête l'automatisation quand les limites sont atteintes</p>
                  </div>
                  <Switch
                    checked={limits.autoPauseOnLimit}
                    onCheckedChange={(v: boolean) => setLimits({ ...limits, autoPauseOnLimit: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Respecter les limites LinkedIn</p>
                    <p className="text-sm text-gray-500">Ne jamais dépasser les limites officielles de LinkedIn</p>
                  </div>
                  <Switch
                    checked={limits.respectLinkedInLimits}
                    onCheckedChange={(v: boolean) => setLimits({ ...limits, respectLinkedInLimits: v })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Default Targeting */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Ciblage par Défaut
              </CardTitle>
              <CardDescription>Ces critères seront appliqués par défaut aux nouvelles campagnes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="target-industry" className="block text-sm font-medium text-gray-700 mb-1">Secteur d'activité</label>
                  <div id="industry-dropdown" className="relative">
                    <button
                      onClick={() => setIndustryDropdownOpen(!industryDropdownOpen)}
                      className="flex items-center gap-3 w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-blue-300 transition-all cursor-pointer"
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                      <span className="truncate">{targeting.defaultIndustry}</span>
                    </button>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    
                    {industryDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 max-h-60 overflow-auto">
                        {[
                          'Tous', 'Technologie / SaaS', 'Finance / Banque', 'Marketing / Média',
                          'Consulting', 'Retail / E-commerce', 'Santé / Pharma'
                        ].map((industry) => (
                          <button
                            key={industry}
                            onClick={() => { setTargeting({ ...targeting, defaultIndustry: industry }); setIndustryDropdownOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                          >
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                            <span className="truncate">{industry}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label htmlFor="target-size" className="block text-sm font-medium text-gray-700 mb-1">Taille d'entreprise</label>
                  <div id="size-dropdown" className="relative">
                    <button
                      onClick={() => setSizeDropdownOpen(!sizeDropdownOpen)}
                      className="flex items-center gap-3 w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-blue-300 transition-all cursor-pointer"
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                      <span className="truncate">{targeting.defaultCompanySize}</span>
                    </button>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    
                    {sizeDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 max-h-60 overflow-auto">
                        {[
                          'Toutes', '1-10 employés (Startup)', '11-50 employés', '51-200 employés',
                          '201-500 employés', '500+ employés'
                        ].map((size) => (
                          <button
                            key={size}
                            onClick={() => { setTargeting({ ...targeting, defaultCompanySize: size }); setSizeDropdownOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                          >
                            <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                            <span className="truncate">{size}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label htmlFor="target-location" className="block text-sm font-medium text-gray-700 mb-1">Localisation</label>
                  <input
                    id="target-location"
                    aria-label="Localisation"
                    value={targeting.defaultLocation}
                    onChange={(e) => setTargeting({ ...targeting, defaultLocation: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="target-seniority" className="block text-sm font-medium text-gray-700 mb-1">Seniorité</label>
                  <div id="seniority-dropdown" className="relative">
                    <button
                      onClick={() => setSeniorityDropdownOpen(!seniorityDropdownOpen)}
                      className="flex items-center gap-3 w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-blue-300 transition-all cursor-pointer"
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        targeting.defaultSeniority === 'Tous niveaux' ? 'bg-gray-400' :
                        targeting.defaultSeniority === 'Débutant / Junior' ? 'bg-green-500' :
                        targeting.defaultSeniority === 'Confirmé' ? 'bg-blue-500' :
                        targeting.defaultSeniority === 'Cadre / Directeur' ? 'bg-purple-500' : 'bg-orange-500'
                      }`}></span>
                      <span className="truncate">{targeting.defaultSeniority}</span>
                    </button>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    
                    {seniorityDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                        {[
                          { value: 'Tous niveaux', color: 'bg-gray-400' },
                          { value: 'Débutant / Junior', color: 'bg-green-500' },
                          { value: 'Confirmé', color: 'bg-blue-500' },
                          { value: 'Cadre / Directeur', color: 'bg-purple-500' },
                          { value: 'VP / C-Level', color: 'bg-orange-500' }
                        ].map((seniority) => (
                          <button
                            key={seniority.value}
                            onClick={() => { setTargeting({ ...targeting, defaultSeniority: seniority.value }); setSeniorityDropdownOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                          >
                            <span className={`w-2.5 h-2.5 rounded-full ${seniority.color}`}></span>
                            <span className="truncate">{seniority.value}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label htmlFor="target-function" className="block text-sm font-medium text-gray-700 mb-1">Fonction</label>
                  <div id="function-dropdown" className="relative">
                    <button
                      onClick={() => setFunctionDropdownOpen(!functionDropdownOpen)}
                      className="flex items-center gap-3 w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-blue-300 transition-all cursor-pointer"
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                      <span className="truncate">{targeting.defaultFunction}</span>
                    </button>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    
                    {functionDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 max-h-60 overflow-auto">
                        {[
                          'Toutes fonctions', 'IT / Engineering', 'Marketing / Communication',
                          'Ventes / Business Dev', 'Finance / RH', 'Opérations / Produit'
                        ].map((func) => (
                          <button
                            key={func}
                            onClick={() => { setTargeting({ ...targeting, defaultFunction: func }); setFunctionDropdownOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                          >
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                            <span className="truncate">{func}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">2nd degré uniquement</label>
                  <div className="pt-2">
                    <Switch
                      checked={targeting.onlySecondDegree}
                      onCheckedChange={(v: boolean) => setTargeting({ ...targeting, onlySecondDegree: v })}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Exclure les concurrents</span>
                  <Switch
                    checked={targeting.excludeCompetitors}
                    onCheckedChange={(v: boolean) => setTargeting({ ...targeting, excludeCompetitors: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Exclure clients existants</span>
                  <Switch
                    checked={targeting.excludeExistingCustomers}
                    onCheckedChange={(v: boolean) => setTargeting({ ...targeting, excludeExistingCustomers: v })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AUTOMATION TAB */}
        <TabsContent value="automation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                Paramètres d'Automatisation
              </CardTitle>
              <CardDescription>Contrôlez le timing et le comportement de l'agent</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Délai min entre actions: <span className="text-blue-600 font-bold">{automation.minDelayBetweenActions}s</span>
                  </label>
                  <Slider
                    value={[automation.minDelayBetweenActions]}
                    onValueChange={([v]: number[]) => setAutomation({ ...automation, minDelayBetweenActions: v })}
                    max={300}
                    min={10}
                    step={5}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Délai max entre actions: <span className="text-blue-600 font-bold">{automation.maxDelayBetweenActions}s</span>
                  </label>
                  <Slider
                    value={[automation.maxDelayBetweenActions]}
                    onValueChange={([v]: number[]) => setAutomation({ ...automation, maxDelayBetweenActions: v })}
                    max={600}
                    min={30}
                    step={10}
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="auto-start" className="block text-sm font-medium text-gray-700 mb-1">Heure de début</label>
                  <input
                    id="auto-start"
                    aria-label="Heure de début"
                    type="time"
                    value={automation.workingHoursStart}
                    onChange={(e) => setAutomation({ ...automation, workingHoursStart: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="auto-end" className="block text-sm font-medium text-gray-700 mb-1">Heure de fin</label>
                  <input
                    id="auto-end"
                    aria-label="Heure de fin"
                    type="time"
                    value={automation.workingHoursEnd}
                    onChange={(e) => setAutomation({ ...automation, workingHoursEnd: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="auto-timezone" className="block text-sm font-medium text-gray-700 mb-1">Fuseau horaire</label>
                  <select
                    id="auto-timezone"
                    aria-label="Fuseau horaire"
                    value={automation.timezone}
                    onChange={(e) => setAutomation({ ...automation, timezone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option>Europe/Paris (UTC+1)</option>
                    <option>Europe/London (UTC+0)</option>
                    <option>America/New_York (UTC-5)</option>
                    <option>America/Los_Angeles (UTC-8)</option>
                    <option>Asia/Tokyo (UTC+9)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jours de prospection</label>
                  <div className="flex gap-2 mt-2">
                    {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
                      <button
                        key={day}
                        className={`w-10 h-10 rounded-lg text-xs font-medium transition-colors ${
                          automation.workingDays.includes(day)
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Randomiser les délais</p>
                    <p className="text-sm text-gray-500">Varier les délais entre actions pour simuler un humain</p>
                  </div>
                  <Switch
                    checked={automation.randomizeDelays}
                    onCheckedChange={(v: boolean) => setAutomation({ ...automation, randomizeDelays: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Comportement humain simulé</p>
                    <p className="text-sm text-gray-500">Visite des profils, scroll, temps de lecture variable</p>
                  </div>
                  <Switch
                    checked={automation.simulateHumanBehavior}
                    onCheckedChange={(v: boolean) => setAutomation({ ...automation, simulateHumanBehavior: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Relances automatiques</p>
                    <p className="text-sm text-gray-500">Envoyer automatiquement les messages de relance</p>
                  </div>
                  <Switch
                    checked={automation.autoFollowUp}
                    onCheckedChange={(v: boolean) => setAutomation({ ...automation, autoFollowUp: v })}
                  />
                </div>
                {automation.autoFollowUp && (
                  <div className="pl-4 border-l-2 border-blue-200 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Délai de relance: {automation.followUpDelay} jours
                      </label>
                      <Slider
                        value={[automation.followUpDelay]}
                        onValueChange={([v]: number[]) => setAutomation({ ...automation, followUpDelay: v })}
                        max={14}
                        min={1}
                        step={1}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre max de relances: {automation.maxFollowUps}
                      </label>
                      <Slider
                        value={[automation.maxFollowUps]}
                        onValueChange={([v]: number[]) => setAutomation({ ...automation, maxFollowUps: v })}
                        max={5}
                        min={0}
                        step={1}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI TAB */}
        <TabsContent value="ai" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-purple-600" />
                Intelligence Artificielle
              </CardTitle>
              <CardDescription>Configurez l'IA pour la personnalisation et les réponses automatiques</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <Zap className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">IA Activée</p>
                    <p className="text-sm text-gray-500">Personnalisation automatique des messages</p>
                  </div>
                </div>
                <Switch
                  checked={aiSettings.aiEnabled}
                  onCheckedChange={(v: boolean) => setAiSettings({ ...aiSettings, aiEnabled: v })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ai-model" className="block text-sm font-medium text-gray-700 mb-1">Modèle IA</label>
                  <div id="ai-model-dropdown" className="relative">
                    <button
                      onClick={() => setAiModelDropdownOpen(!aiModelDropdownOpen)}
                      className="flex items-center gap-3 w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-blue-300 transition-all cursor-pointer"
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        aiSettings.aiModel === 'gpt-4' ? 'bg-green-500' :
                        aiSettings.aiModel === 'gpt-3.5' ? 'bg-blue-500' : 'bg-purple-500'
                      }`}></span>
                      <span className="truncate">{
                        aiSettings.aiModel === 'gpt-4' ? 'GPT-4 (Meilleure qualité)' :
                        aiSettings.aiModel === 'gpt-3.5' ? 'GPT-3.5 (Plus rapide)' : 'Claude 3'
                      }</span>
                    </button>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    
                    {aiModelDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                        {[
                          { value: 'gpt-4', label: 'GPT-4 (Meilleure qualité)', color: 'bg-green-500' },
                          { value: 'gpt-3.5', label: 'GPT-3.5 (Plus rapide)', color: 'bg-blue-500' },
                          { value: 'claude', label: 'Claude 3', color: 'bg-purple-500' }
                        ].map((model) => (
                          <button
                            key={model.value}
                            onClick={() => { setAiSettings({ ...aiSettings, aiModel: model.value }); setAiModelDropdownOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                          >
                            <span className={`w-2.5 h-2.5 rounded-full ${model.color}`}></span>
                            <span className="truncate">{model.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label htmlFor="ai-tone" className="block text-sm font-medium text-gray-700 mb-1">Ton des messages</label>
                  <div id="tone-dropdown" className="relative">
                    <button
                      onClick={() => setToneDropdownOpen(!toneDropdownOpen)}
                      className="flex items-center gap-3 w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-blue-300 transition-all cursor-pointer"
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        aiSettings.tone === 'professional' ? 'bg-blue-500' :
                        aiSettings.tone === 'friendly' ? 'bg-green-500' :
                        aiSettings.tone === 'formal' ? 'bg-purple-500' : 'bg-orange-500'
                      }`}></span>
                      <span className="truncate">{
                        aiSettings.tone === 'professional' ? 'Professionnel' :
                        aiSettings.tone === 'friendly' ? 'Amical' :
                        aiSettings.tone === 'formal' ? 'Formel' : 'Décontracté'
                      }</span>
                    </button>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    
                    {toneDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                        {[
                          { value: 'professional', label: 'Professionnel', color: 'bg-blue-500' },
                          { value: 'friendly', label: 'Amical', color: 'bg-green-500' },
                          { value: 'formal', label: 'Formel', color: 'bg-purple-500' },
                          { value: 'casual', label: 'Décontracté', color: 'bg-orange-500' }
                        ].map((tone) => (
                          <button
                            key={tone.value}
                            onClick={() => { setAiSettings({ ...aiSettings, tone: tone.value }); setToneDropdownOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                          >
                            <span className={`w-2.5 h-2.5 rounded-full ${tone.color}`}></span>
                            <span className="truncate">{tone.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Niveau de personnalisation: <span className="text-blue-600 font-bold">{aiSettings.personalizationLevel}%</span>
                </label>
                <Slider
                  value={[aiSettings.personalizationLevel]}
                  onValueChange={([v]: number[]) => setAiSettings({ ...aiSettings, personalizationLevel: v })}
                  max={100}
                  min={0}
                  step={5}
                />
                <p className="text-xs text-gray-500 mt-1">Plus élevé = messages plus personnalisés mais plus coûteux</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Réponses automatiques IA</p>
                    <p className="text-sm text-gray-500">L'IA répond automatiquement aux messages reçus</p>
                  </div>
                  <Switch
                    checked={aiSettings.autoReplyEnabled}
                    onCheckedChange={(v: boolean) => setAiSettings({ ...aiSettings, autoReplyEnabled: v })}
                  />
                </div>
                {aiSettings.autoReplyEnabled && (
                  <div className="pl-4 border-l-2 border-purple-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confiance minimum: <span className="text-blue-600 font-bold">{aiSettings.autoReplyConfidence}%</span>
                    </label>
                    <Slider
                      value={[aiSettings.autoReplyConfidence]}
                      onValueChange={([v]: number[]) => setAiSettings({ ...aiSettings, autoReplyConfidence: v })}
                      max={100}
                      min={50}
                      step={5}
                    />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Détection automatique de la langue</p>
                    <p className="text-sm text-gray-500">Adapter la langue selon le profil du prospect</p>
                  </div>
                  <Switch
                    checked={aiSettings.autoDetectLanguage}
                    onCheckedChange={(v: boolean) => setAiSettings({ ...aiSettings, autoDetectLanguage: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Analyse de sentiment</p>
                    <p className="text-sm text-gray-500">Détecter l'intention et la réaction des prospects</p>
                  </div>
                  <Switch
                    checked={aiSettings.sentimentAnalysis}
                    onCheckedChange={(v: boolean) => setAiSettings({ ...aiSettings, sentimentAnalysis: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Relances intelligentes</p>
                    <p className="text-sm text-gray-500">Adapter le timing des relances selon le comportement</p>
                  </div>
                  <Switch
                    checked={aiSettings.smartFollowUp}
                    onCheckedChange={(v: boolean) => setAiSettings({ ...aiSettings, smartFollowUp: v })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NOTIFICATIONS TAB */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-yellow-600" />
                Notifications
              </CardTitle>
              <CardDescription>Choisissez quand et comment vous être notifié</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Mail className="w-4 h-4" /> Notifications Email
                </h4>
                <div className="space-y-3">
                  {[
                    { key: "emailDailySummary", label: "Résumé quotidien", desc: "Recevoir un email récapitulatif chaque jour" },
                    { key: "emailWeeklyReport", label: "Rapport hebdomadaire", desc: "Statistiques et performance de la semaine" },
                    { key: "emailNewReply", label: "Nouvelle réponse", desc: "Être alerté quand quelqu'un répond" },
                    { key: "emailNewConversion", label: "Nouvelle conversion", desc: "Alerte immédiate pour chaque conversion" },
                    { key: "emailLimitWarning", label: "Alerte limites", desc: "Avertissement quand vous approchez des limites" },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{item.label}</p>
                        <p className="text-sm text-gray-500">{item.desc}</p>
                      </div>
                      <Switch
                        checked={notifications[item.key as keyof typeof notifications] as boolean}
                        onCheckedChange={(v: boolean) => setNotifications({ ...notifications, [item.key]: v })}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Smartphone className="w-4 h-4" /> Notifications Push
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Notifications in-app</p>
                      <p className="text-sm text-gray-500">Afficher dans l'application</p>
                    </div>
                    <Switch
                      checked={notifications.inAppNotifications}
                      onCheckedChange={(v: boolean) => setNotifications({ ...notifications, inAppNotifications: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Notifications navigateur</p>
                      <p className="text-sm text-gray-500">Notifications desktop du navigateur</p>
                    </div>
                    <Switch
                      checked={notifications.browserNotifications}
                      onCheckedChange={(v: boolean) => setNotifications({ ...notifications, browserNotifications: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Push mobile</p>
                      <p className="text-sm text-gray-500">Notifications sur votre téléphone</p>
                    </div>
                    <Switch
                      checked={notifications.mobilePush}
                      onCheckedChange={(v: boolean) => setNotifications({ ...notifications, mobilePush: v })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Webhook className="w-4 h-4" /> Webhooks
                </h4>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="slack-webhook" className="block text-sm font-medium text-gray-700 mb-1">Slack Webhook URL</label>
                    <input
                      id="slack-webhook"
                      aria-label="Slack Webhook URL"
                      type="text"
                      value={notifications.slackWebhook}
                      onChange={(e) => setNotifications({ ...notifications, slackWebhook: e.target.value })}
                      placeholder="https://hooks.slack.com/services/..."
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="discord-webhook" className="block text-sm font-medium text-gray-700 mb-1">Discord Webhook URL</label>
                    <input
                      id="discord-webhook"
                      aria-label="Discord Webhook URL"
                      type="text"
                      value={notifications.discordWebhook}
                      onChange={(e) => setNotifications({ ...notifications, discordWebhook: e.target.value })}
                      placeholder="https://discord.com/api/webhooks/..."
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* INTEGRATIONS TAB */}
        <TabsContent value="integrations" className="space-y-6">
          {/* Connected Integrations Summary */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { icon: Briefcase, name: "CRM", status: integrations.crm.connected, color: "blue" },
              { icon: Calendar, name: "Calendrier", status: integrations.calendar.connected, color: "red" },
              { icon: Zap, name: "Zapier", status: integrations.zapier.connected, color: "orange" },
              { icon: Database, name: "Google Sheets", status: integrations.googleSheets.connected, color: "green" },
            ].map((item) => (
              <Card key={item.name} className={`border-2 ${item.status ? `border-${item.color}-200 bg-${item.color}-50/30` : 'border-gray-200'}`}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 bg-${item.color}-100 rounded-lg flex items-center justify-center`}>
                      <item.icon className={`w-5 h-5 text-${item.color}-600`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                      <Badge className={`text-xs ${item.status ? `bg-${item.color}-100 text-${item.color}-700` : 'bg-gray-100 text-gray-600'}`}>
                        {item.status ? "Connecté" : "Non connecté"}
                      </Badge>
                    </div>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${item.status ? 'bg-green-500' : 'bg-gray-300'}`} />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Integration Details */}
          <div className="grid grid-cols-2 gap-4">
            {/* CRM */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Briefcase className="w-4 h-4 text-blue-600" />
                    </div>
                    CRM
                  </CardTitle>
                  {integrations.crm.connected && <Badge className="bg-green-100 text-green-700">Actif</Badge>}
                </div>
                <CardDescription>Synchronisez vos prospects avec votre CRM</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <select
                  id="crm-type"
                  aria-label="Type de CRM"
                  value={integrations.crm.type}
                  onChange={(e) => setIntegrations({ ...integrations, crm: { ...integrations.crm, type: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sélectionner un CRM</option>
                  <option value="hubspot">HubSpot</option>
                  <option value="salesforce">Salesforce</option>
                  <option value="pipedrive">Pipedrive</option>
                  <option value="zoho">Zoho CRM</option>
                </select>
                
                {integrations.crm.connected ? (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      <span>Connecté à HubSpot</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Dernière synchronisation: Il y a 2h</p>
                    <div className="flex gap-2 mt-3">
                      <Button variant="outline" size="sm" className="flex-1">Configurer</Button>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">Déconnecter</Button>
                    </div>
                  </div>
                ) : (
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    <ExternalLink className="w-4 h-4 mr-2" /> Connecter {integrations.crm.type ? integrations.crm.type.charAt(0).toUpperCase() + integrations.crm.type.slice(1) : "CRM"}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Calendar */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-red-600" />
                    </div>
                    Calendrier
                  </CardTitle>
                  {integrations.calendar.connected && <Badge className="bg-green-100 text-green-700">Connecté</Badge>}
                </div>
                <CardDescription>Planifiez vos rendez-vous automatiquement</CardDescription>
              </CardHeader>
              <CardContent>
                {integrations.calendar.connected ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <span className="text-xl">G</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">Google Calendar</p>
                        <p className="text-sm text-green-600">{integrations.calendar.email}</p>
                      </div>
                      <CheckCircle className="w-5 h-5 text-green-600 ml-auto" />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Settings2 className="w-4 h-4 mr-2" /> Configurer
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                        Révoquer
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" className="w-full">
                    <ExternalLink className="w-4 h-4 mr-2" /> Connecter Google Calendar
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Zapier */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Zap className="w-4 h-4 text-orange-600" />
                    </div>
                    Zapier
                  </CardTitle>
                  {integrations.zapier.connected && <Badge className="bg-green-100 text-green-700">5 Zaps actifs</Badge>}
                </div>
                <CardDescription>Automatisez avec 5000+ applications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-3">
                  {["Slack", "Gmail", "Trello", "Notion", "Airtable"].map((app) => (
                    <Badge key={app} variant="outline" className="text-xs">
                      {app}
                    </Badge>
                  ))}
                </div>
                <Button className={`w-full ${integrations.zapier.connected ? 'bg-orange-600 hover:bg-orange-700' : 'bg-gray-900 hover:bg-gray-800'}`}>
                  <Zap className="w-4 h-4 mr-2" />
                  {integrations.zapier.connected ? "Gérer les Zaps" : "Connecter Zapier"}
                </Button>
              </CardContent>
            </Card>

            {/* Google Sheets */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <Database className="w-4 h-4 text-green-600" />
                    </div>
                    Google Sheets
                  </CardTitle>
                  {integrations.googleSheets.connected && <Badge className="bg-green-100 text-green-700">Actif</Badge>}
                </div>
                <CardDescription>Exportez vos données vers Sheets</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Export automatique quotidien</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Synchronisation bidirectionnelle</span>
                </div>
                <Button variant={integrations.googleSheets.connected ? "outline" : "default"} className="w-full">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {integrations.googleSheets.connected ? "Configurer l'export" : "Connecter Sheets"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Webhooks Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Webhook className="w-4 h-4 text-purple-600" />
                Webhooks
              </CardTitle>
              <CardDescription>Recevez des notifications en temps réel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="slack-webhook" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" /> Slack Webhook
                  </label>
                  <input
                    id="slack-webhook"
                    aria-label="Slack Webhook URL"
                    type="text"
                    value={notifications.slackWebhook}
                    onChange={(e) => setNotifications({ ...notifications, slackWebhook: e.target.value })}
                    placeholder="https://hooks.slack.com/services/..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="discord-webhook" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <Globe className="w-4 h-4" /> Discord Webhook
                  </label>
                  <input
                    id="discord-webhook"
                    aria-label="Discord Webhook URL"
                    type="text"
                    value={notifications.discordWebhook}
                    onChange={(e) => setNotifications({ ...notifications, discordWebhook: e.target.value })}
                    placeholder="https://discord.com/api/webhooks/..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
              <Button variant="outline" size="sm">
                <Webhook className="w-4 h-4 mr-2" /> Tester les webhooks
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SECURITY TAB */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-600" />
                Sécurité
              </CardTitle>
              <CardDescription>Protégez votre compte et vos données</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* API Key */}
              <div>
                <label htmlFor="api-key" className="block text-sm font-medium text-gray-700 mb-2">Clé API</label>
                <div className="flex gap-2">
                  <input
                    id="api-key"
                    aria-label="Clé API"
                    type={security.apiKeyVisible ? "text" : "password"}
                    value={security.apiKey}
                    readOnly
                    className="flex-1 px-3 py-2 border rounded-lg text-sm font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSecurity({ ...security, apiKeyVisible: !security.apiKeyVisible })}
                  >
                    {security.apiKeyVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(security.apiKey)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <Button variant="outline" size="sm" className="mt-2">
                  <RefreshCw className="w-4 h-4 mr-2" /> Régénérer la clé
                </Button>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Authentification à deux facteurs (2FA)</p>
                    <p className="text-sm text-gray-500">Sécurisez votre compte avec 2FA</p>
                  </div>
                  <Switch
                    checked={security.twoFactorEnabled}
                    onCheckedChange={(v: boolean) => setSecurity({ ...security, twoFactorEnabled: v })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Alertes de connexion</p>
                    <p className="text-sm text-gray-500">Être notifié des nouvelles connexions</p>
                  </div>
                  <Switch
                    checked={security.loginAlerts}
                    onCheckedChange={(v: boolean) => setSecurity({ ...security, loginAlerts: v })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timeout de session: {security.sessionTimeout} min
                  </label>
                  <Slider
                    value={[security.sessionTimeout]}
                    onValueChange={([v]: number[]) => setSecurity({ ...security, sessionTimeout: v })}
                    max={120}
                    min={5}
                    step={5}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Whitelist IP (optionnel)</label>
                  <textarea
                    value={security.ipWhitelist}
                    onChange={(e) => setSecurity({ ...security, ipWhitelist: e.target.value })}
                    placeholder="192.168.1.1, 10.0.0.0/24"
                    className="w-full px-3 py-2 border rounded-lg text-sm h-20"
                  />
                  <p className="text-xs text-gray-500 mt-1">Séparez les IP par des virgules</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  <Database className="w-4 h-4" /> Données
                </h4>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1">
                    <Download className="w-4 h-4 mr-2" /> Exporter mes données
                  </Button>
                  <Button variant="destructive" className="flex-1">
                    <Trash2 className="w-4 h-4 mr-2" /> Supprimer mon compte
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* APPEARANCE TAB */}
        <TabsContent value="appearance" className="space-y-6">
          {/* Theme Selection - Creative Cards */}
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardHeader className="bg-linear-to-r from-pink-50 via-purple-50 to-blue-50 border-b">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-2xl shadow-md flex items-center justify-center">
                  <Palette className="w-6 h-6 text-pink-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Personnalisation visuelle</CardTitle>
                  <CardDescription>Choisissez l'apparence qui vous convient le mieux</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              {/* Theme Preview Cards */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                  Thème de l'interface
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { 
                      value: "light", 
                      label: "Clair", 
                      desc: "Interface lumineuse et épurée",
                      icon: Sun,
                      preview: "bg-white",
                      accent: "bg-blue-500",
                      textColor: "text-gray-900"
                    },
                    { 
                      value: "dark", 
                      label: "Sombre", 
                      desc: "Mode nuit, plus doux pour les yeux",
                      icon: Moon,
                      preview: "bg-gray-900",
                      accent: "bg-purple-500",
                      textColor: "text-white"
                    },
                    { 
                      value: "auto", 
                      label: "Automatique", 
                      desc: "S'adapte à l'heure du jour",
                      icon: Monitor,
                      preview: "bg-linear-to-br from-white to-gray-900",
                      accent: "bg-gradient-to-r from-blue-500 to-purple-500",
                      textColor: "text-gray-800"
                    },
                  ].map((t) => {
                    const Icon = t.icon;
                    const isSelected = appearance.theme === t.value;
                    return (
                      <button
                        key={t.value}
                        onClick={() => setAppearance({ ...appearance, theme: t.value })}
                        className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 ${
                          isSelected 
                            ? "border-blue-500 shadow-lg shadow-blue-500/20" 
                            : "border-gray-200 hover:border-gray-300 hover:shadow-md"
                        }`}
                      >
                        {/* Preview Area */}
                        <div className={`h-32 ${t.preview} p-4 relative`}>
                          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.3),transparent_70%)]" />
                          
                          {/* Mock UI Elements */}
                          <div className="space-y-2 relative z-10">
                            <div className={`h-3 w-16 rounded ${t.accent} opacity-80`} />
                            <div className={`h-2 w-full rounded ${isSelected ? 'bg-gray-300' : 'bg-gray-400'} opacity-40`} />
                            <div className={`h-2 w-3/4 rounded ${isSelected ? 'bg-gray-300' : 'bg-gray-400'} opacity-30`} />
                            <div className="flex gap-2 mt-3">
                              <div className={`h-6 w-6 rounded ${t.accent}`} />
                              <div className={`h-6 w-6 rounded ${isSelected ? 'bg-gray-200' : 'bg-gray-600'} opacity-50`} />
                            </div>
                          </div>
                          
                          {/* Selected Indicator */}
                          {isSelected && (
                            <motion.div 
                              initial={{ scale: 0 }} 
                              animate={{ scale: 1 }}
                              className="absolute top-3 right-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"
                            >
                              <Check className="w-4 h-4 text-white" />
                            </motion.div>
                          )}
                        </div>
                        
                        {/* Info Area */}
                        <div className="p-4 bg-white">
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
                            <span className={`font-semibold ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                              {t.label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 text-left">{t.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Separator className="bg-gray-200" />

              {/* Accent Color Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-pink-500" />
                  Couleur d'accent principale
                </label>
                <div className="flex flex-wrap gap-3">
                  {[
                    { color: "bg-blue-500", name: "Bleu", hex: "#3B82F6" },
                    { color: "bg-purple-500", name: "Violet", hex: "#A855F7" },
                    { color: "bg-pink-500", name: "Rose", hex: "#EC4899" },
                    { color: "bg-red-500", name: "Rouge", hex: "#EF4444" },
                    { color: "bg-orange-500", name: "Orange", hex: "#F97316" },
                    { color: "bg-green-500", name: "Vert", hex: "#22C55E" },
                    { color: "bg-cyan-500", name: "Cyan", hex: "#06B6D4" },
                    { color: "bg-indigo-500", name: "Indigo", hex: "#6366F1" },
                  ].map((c) => (
                    <button
                      key={c.name}
                      className="group relative flex flex-col items-center gap-2"
                    >
                      <div className={`w-12 h-12 rounded-xl ${c.color} shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-200 flex items-center justify-center`}>
                        <div className="w-4 h-4 bg-white/30 rounded-full" />
                      </div>
                      <span className="text-xs text-gray-600 font-medium">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Separator className="bg-gray-200" />

              {/* Settings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Language Selection */}
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-500" />
                    Langue de l'interface
                  </label>
                  <div className="relative">
                    <select
                      id="appearance-language"
                      aria-label="Langue"
                      value={appearance.language}
                      onChange={(e) => setAppearance({ ...appearance, language: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all appearance-none cursor-pointer"
                    >
                      <option value="fr">🇫🇷 Français</option>
                      <option value="en">🇬🇧 English</option>
                      <option value="es">🇪🇸 Español</option>
                      <option value="de">🇩🇪 Deutsch</option>
                      <option value="it">🇮🇹 Italiano</option>
                      <option value="pt">🇵🇹 Português</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Date Format */}
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-green-500" />
                    Format de date
                  </label>
                  <div className="relative">
                    <select
                      id="appearance-dateformat"
                      aria-label="Format date"
                      value={appearance.dateFormat}
                      onChange={(e) => setAppearance({ ...appearance, dateFormat: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all appearance-none cursor-pointer"
                    >
                      <option value="DD/MM/YYYY">31/12/2024 (Français)</option>
                      <option value="MM/DD/YYYY">12/31/2024 (US)</option>
                      <option value="YYYY-MM-DD">2024-12-31 (ISO)</option>
                      <option value="DD MMMM YYYY">31 décembre 2024 (Long)</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Time Format */}
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-500" />
                    Format d'heure
                  </label>
                  <div className="flex gap-2">
                    {["24h", "12h"].map((format) => (
                      <button
                        key={format}
                        onClick={() => setAppearance({ ...appearance, timeFormat: format })}
                        className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all ${
                          appearance.timeFormat === format
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        {format === "24h" ? "14:30 (24h)" : "2:30 PM (12h)"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Compact Mode */}
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-500" />
                    Densité d'affichage
                  </label>
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-blue-300 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-6 rounded-full transition-colors ${appearance.compactMode ? 'bg-blue-500' : 'bg-gray-300'}`}>
                        <div className={`w-5 h-5 bg-white rounded-full shadow-md mt-0.5 transition-transform duration-300 ${appearance.compactMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Mode compact</p>
                        <p className="text-xs text-gray-500">Réduire l'espacement</p>
                      </div>
                    </div>
                    <Switch
                      checked={appearance.compactMode}
                      onCheckedChange={(v: boolean) => setAppearance({ ...appearance, compactMode: v })}
                    />
                  </div>
                </div>
              </div>

              <Separator className="bg-gray-200" />

              {/* Typography Preview */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Type className="w-4 h-4 text-indigo-500" />
                  Aperçu de la typographie
                </label>
                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-200">
                  <div className="space-y-4">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">Titre principal</p>
                      <p className="text-sm text-gray-500">Police : Inter, Taille : 24px</p>
                    </div>
                    <div>
                      <p className="text-base text-gray-700">Texte de corps standard utilisé pour la majorité du contenu de l'interface. C'est un exemple de paragraphe.</p>
                      <p className="text-sm text-gray-500 mt-1">Police : Inter, Taille : 16px</p>
                    </div>
                    <div className="flex gap-4">
                      <Badge className="bg-blue-100 text-blue-700">Badge exemple</Badge>
                      <span className="text-xs text-gray-500 uppercase tracking-wider">LABEL</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reset Button */}
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  className="text-gray-600 hover:text-gray-900"
                  onClick={() => setAppearance({
                    theme: "light",
                    language: "fr",
                    dateFormat: "DD/MM/YYYY",
                    timeFormat: "24h",
                    compactMode: false,
                  })}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Réinitialiser les préférences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BILLING TAB */}
        <TabsContent value="billing" className="space-y-6">
          {/* Current Plan Card */}
          <Card className="overflow-hidden border-2 border-blue-100">
            <div className="bg-linear-to-r from-blue-600 to-purple-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-white/20 text-white border-0">Plan actuel</Badge>
                    <Badge className="bg-green-400 text-white border-0">{billing.status === "active" ? "Actif" : billing.status}</Badge>
                  </div>
                  <h2 className="text-3xl font-bold">{billing.plan}</h2>
                  <p className="text-blue-100 mt-1">Renouvellement le {billing.renewDate}</p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-bold">99<span className="text-xl">€</span></p>
                  <p className="text-blue-100">par mois</p>
                </div>
              </div>
            </div>
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <p className="text-2xl font-bold text-gray-900">{billing.seats}</p>
                  <p className="text-sm text-gray-500">Utilisateurs inclus</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <p className="text-2xl font-bold text-gray-900">{billing.monthlyContacts.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">Contacts/mois</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <p className="text-2xl font-bold text-gray-900">Illimité</p>
                  <p className="text-sm text-gray-500">Campagnes</p>
                </div>
              </div>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3">
                <CreditCard className="w-4 h-4 mr-2" /> Passer au plan Enterprise
              </Button>
            </CardContent>
          </Card>

          {/* Usage Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Utilisateurs</p>
                      <p className="text-xs text-gray-500">Actuellement utilisés</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-gray-900">{billing.usedSeats}/{billing.seats}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <ProgressBar 
                    value={billing.usedSeats}
                    max={billing.seats}
                    color="blue"
                    className="h-3" 
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">{Math.round((billing.usedSeats / billing.seats) * 100)}% utilisé</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Target className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Contacts</p>
                      <p className="text-xs text-gray-500">Ce mois-ci</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-gray-900">{billing.usedContacts.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <ProgressBar 
                    value={billing.usedContacts}
                    max={billing.monthlyContacts}
                    color="green"
                    className="h-3" 
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">{Math.round((billing.usedContacts / billing.monthlyContacts) * 100)}% du quota utilisé</p>
              </CardContent>
            </Card>
          </div>

          {/* Payment Methods & Invoices */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="w-4 h-4" />
                  Moyen de paiement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 p-3 border rounded-lg mb-3">
                  <div className="w-10 h-6 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">VISA</div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">**** **** **** 4242</p>
                    <p className="text-xs text-gray-500">Expire le 12/26</p>
                  </div>
                  <Badge className="bg-green-100 text-green-700">Par défaut</Badge>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  <Settings2 className="w-4 h-4 mr-2" /> Gérer les cartes
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Download className="w-4 h-4" />
                  Factures récentes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { date: "1 Mars 2026", amount: "99,00 €", status: "Payée" },
                  { date: "1 Février 2026", amount: "99,00 €", status: "Payée" },
                  { date: "1 Janvier 2026", amount: "99,00 €", status: "Payée" },
                ].map((invoice, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <span className="text-sm text-gray-600">{invoice.date}</span>
                    <span className="font-medium text-gray-900">{invoice.amount}</span>
                    <Badge className="bg-green-100 text-green-700 text-xs">{invoice.status}</Badge>
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="w-full text-blue-600">
                  Voir toutes les factures
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Cancel Subscription */}
          <Card className="border-red-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Annuler l'abonnement</p>
                    <p className="text-sm text-gray-500">Vous pouvez annuler à tout moment. L'accès reste jusqu'au {billing.renewDate}.</p>
                  </div>
                </div>
                <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
