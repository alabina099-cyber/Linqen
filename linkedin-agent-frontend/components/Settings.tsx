"use client";

import { useState, useEffect } from "react";
import { useSettings } from "@/contexts/SettingsContext";
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

  // Appearance — synced with global SettingsContext
  const { settings: globalSettings, updateSettings: updateGlobalSettings } = useSettings();
  const [appearance, setAppearanceLocal] = useState({
    theme: globalSettings.theme,
    language: globalSettings.language,
    dateFormat: globalSettings.dateFormat,
    timeFormat: globalSettings.timeFormat,
  });

  // Sync local appearance to global context
  useEffect(() => {
    updateGlobalSettings(appearance as any);
  }, [appearance]);

  // Sync from global on mount
  useEffect(() => {
    setAppearanceLocal({
      theme: globalSettings.theme,
      language: globalSettings.language,
      dateFormat: globalSettings.dateFormat,
      timeFormat: globalSettings.timeFormat,
    });
  }, []);

  const setAppearance = (val: typeof appearance | ((prev: typeof appearance) => typeof appearance)) => {
    setAppearanceLocal(val);
  };

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
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Settings2 className="w-8 h-8 text-blue-600" />
            Paramètres
          </h1>
          <p className="text-gray-600 mt-1">Configurez votre agent LinkedIn et vos préférences</p>
        </div>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 bg-gray-100/50 p-2 rounded-2xl border border-gray-200/50 h-auto">
          <TabsTrigger value="account" className="text-xs sm:text-sm rounded-xl border-2 border-gray-200 bg-white text-gray-600 hover:border-gray-300 data-[state=active]:border-transparent data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all px-2 sm:px-3 py-2"><User className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">Compte</span><span className="sm:hidden">Compte</span></TabsTrigger>
          <TabsTrigger value="automation" className="text-xs sm:text-sm rounded-xl border-2 border-gray-200 bg-white text-gray-600 hover:border-gray-300 data-[state=active]:border-transparent data-[state=active]:bg-gradient-to-br data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all px-2 sm:px-3 py-2"><Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">Automatisation</span><span className="sm:hidden">Auto</span></TabsTrigger>
          <TabsTrigger value="ai" className="text-xs sm:text-sm rounded-xl border-2 border-gray-200 bg-white text-gray-600 hover:border-gray-300 data-[state=active]:border-transparent data-[state=active]:bg-gradient-to-br data-[state=active]:from-pink-500 data-[state=active]:to-rose-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all px-2 sm:px-3 py-2"><Bot className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />IA</TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs sm:text-sm rounded-xl border-2 border-gray-200 bg-white text-gray-600 hover:border-gray-300 data-[state=active]:border-transparent data-[state=active]:bg-gradient-to-br data-[state=active]:from-cyan-500 data-[state=active]:to-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all px-2 sm:px-3 py-2"><Bell className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">Notifications</span><span className="sm:hidden">Notif</span></TabsTrigger>
          <TabsTrigger value="appearance" className="text-xs sm:text-sm rounded-xl border-2 border-gray-200 bg-white text-gray-600 hover:border-gray-300 data-[state=active]:border-transparent data-[state=active]:bg-gradient-to-br data-[state=active]:from-violet-500 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all px-2 sm:px-3 py-2"><Palette className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">Affichage</span><span className="sm:hidden">Affich</span></TabsTrigger>
        </TabsList>

        {/* ACCOUNT TAB */}
        <TabsContent value="account" className="space-y-6">
          {/* LinkedIn Connection — Real Component */}
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="h-1 bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-600" />
            <CardHeader className="bg-gradient-to-br from-blue-50/50 to-white border-b border-gray-100">
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-md shadow-blue-200">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-lg font-bold text-gray-900">Compte LinkedIn</span>
                  <CardDescription className="mt-0.5">Gérez votre connexion et vos informations de compte</CardDescription>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-6">
                <LinkedInAccount />
              </div>
            </CardContent>
          </Card>

        </TabsContent>

        

        {/* AUTOMATION TAB */}
        <TabsContent value="automation" className="space-y-6">
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600" />
            <CardHeader className="bg-gradient-to-br from-amber-50/50 to-white border-b border-gray-100">
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md shadow-amber-200">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-lg font-bold text-gray-900">Paramètres d'Automatisation</span>
                  <CardDescription className="mt-0.5">Contrôlez le timing et le comportement de l'agent</CardDescription>
                </div>
              </CardTitle>
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
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="h-1 bg-gradient-to-r from-pink-400 via-rose-500 to-pink-600" />
            <CardHeader className="bg-gradient-to-br from-pink-50/50 to-white border-b border-gray-100">
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-rose-500 rounded-xl flex items-center justify-center shadow-md shadow-pink-200">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-lg font-bold text-gray-900">Intelligence Artificielle</span>
                  <CardDescription className="mt-0.5">Configurez l'IA pour la personnalisation et les réponses automatiques</CardDescription>
                </div>
              </CardTitle>
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
          

          {/* Notification types */}
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="h-1 bg-gradient-to-r from-cyan-400 via-teal-500 to-cyan-600" />
            <CardHeader className="bg-gradient-to-br from-cyan-50/50 to-white border-b border-gray-100">
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-teal-500 rounded-xl flex items-center justify-center shadow-md shadow-cyan-200">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-lg font-bold text-gray-900">Alertes dans l'extension</span>
                  <CardDescription className="mt-0.5">Choisissez quels événements déclenchent une notification dans le popup</CardDescription>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { key: "emailNewReply", label: "Nouvelle réponse", desc: "Être alerté quand un prospect répond", icon: "💬" },
                { key: "emailNewConversion", label: "Nouvelle conversion", desc: "Alerte immédiate pour chaque conversion", icon: "🎯" },
                { key: "emailLimitWarning", label: "Alerte limites", desc: "Avertissement quand vous approchez des limites LinkedIn", icon: "⚠️" },
                { key: "emailDailySummary", label: "Résumé quotidien", desc: "Récapitulatif des actions du jour dans le popup", icon: "📊" },
                { key: "emailWeeklyReport", label: "Rapport hebdomadaire", desc: "Statistiques et performance de la semaine", icon: "📈" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{item.icon}</span>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                  <Switch
                    checked={notifications[item.key as keyof typeof notifications] as boolean}
                    onCheckedChange={(v: boolean) => setNotifications({ ...notifications, [item.key]: v })}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* APPEARANCE TAB */}
        <TabsContent value="appearance" className="space-y-6">
          {/* Theme Selection - Creative Cards */}
          <Card className="border-0 shadow-lg overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-violet-400 via-purple-500 to-violet-600" />
            <CardHeader className="bg-gradient-to-br from-violet-50/50 to-white border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-violet-400 to-purple-500 rounded-xl flex items-center justify-center shadow-md shadow-violet-200">
                    <Palette className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-lg font-bold text-gray-900">Personnalisation visuelle</span>
                    <CardDescription className="mt-0.5">Choisissez l'apparence qui vous convient le mieux</CardDescription>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-gray-600 hover:text-gray-900 bg-white/80 backdrop-blur-sm"
                  onClick={() => setAppearance({
                    theme: "light",
                    language: "fr",
                    dateFormat: "DD/MM/YYYY",
                    timeFormat: "24h",
                  })}
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Réinitialiser les préférences
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              {/* Theme Preview Cards */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-blue-500" />
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

              {/* Langue et Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-500" />
                  Langue et Date
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Language Selection */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-500">Langue</label>
                  <div className="flex gap-2">
                    {[
                      { value: "fr", label: "FR", desc: "Français" },
                      { value: "en", label: "EN", desc: "English" },
                    ].map((lang) => (
                      <button
                        key={lang.value}
                        onClick={() => setAppearance({ ...appearance, language: lang.value })}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all duration-200 ${
                          appearance.language === lang.value
                            ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm shadow-blue-100"
                            : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                          appearance.language === lang.value ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-600"
                        }`}>{lang.label}</span>
                        <span>{lang.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Format */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-500">Format de date</label>
                  <div className="flex gap-2">
                    {[
                      { value: "DD/MM/YYYY", label: "31/12/2024", badge: "FR" },
                      { value: "MM/DD/YYYY", label: "12/31/2024", badge: "US" },
                    ].map((fmt) => (
                      <button
                        key={fmt.value}
                        onClick={() => setAppearance({ ...appearance, dateFormat: fmt.value })}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all duration-200 ${
                          appearance.dateFormat === fmt.value
                            ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm shadow-blue-100"
                            : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                          appearance.dateFormat === fmt.value ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-600"
                        }`}>{fmt.badge}</span>
                        <span>{fmt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Format */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-500">Format d'heure</label>
                  <div className="flex gap-2">
                    {["24h", "12h"].map((format) => (
                      <button
                        key={format}
                        onClick={() => setAppearance({ ...appearance, timeFormat: format })}
                        className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all duration-200 ${
                          appearance.timeFormat === format
                            ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm shadow-blue-100"
                            : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {format === "24h" ? "14:30 (24h)" : "2:30 PM (12h)"}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
              </div>

            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
