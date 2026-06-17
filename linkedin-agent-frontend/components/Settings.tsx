"use client";

import { useState, useEffect, useRef } from "react";
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
import { Dropdown } from "./ui/dropdown";
import LinkedInAccount from "./LinkedInAccount";
import {
  User,
  Bell,
  Shield,
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
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Sun,
  Moon,
  Monitor,
  Type,
  Layers,
  ChevronDown,
} from "lucide-react";

interface AIModel {
  value: string;
  label: string;
  color: string;
  available: boolean;
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState("account");
  const [saved, setSaved] = useState(false);
  
  // Account Settings
  const [account, setAccount] = useState({
    name: "",
    email: "",
    company: "",
    role: "Admin",
    avatar: "",
    linkedInConnected: false,
    linkedInEmail: "",
    lastSync: "",
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
    aiModel: "gpt-4o-mini",
    autoReplyEnabled: false,
    autoReplyConfidence: 75,
    personalizationLevel: 80,
    tone: "professional",
    autoDetectLanguage: true,
    sentimentAnalysis: true,
    smartFollowUp: true,
  });
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [modelSaving, setModelSaving] = useState(false);
  const [agentSaving, setAgentSaving] = useState(false);
  const agentInitialized = useRef(false);

  // Default Targeting
  const [targeting, setTargeting] = useState({
    defaultIndustry: "Technology / SaaS",
    defaultCompanySize: "11-50 employees",
    defaultLocation: "France",
    defaultSeniority: "Manager / Director",
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
  const [notifLoading, setNotifLoading] = useState(true);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);
  const notifInitialized = useRef(false);

  // Load AI model config + agent settings from backend on mount
  useEffect(() => {
    fetch('/api/agent-config')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setAvailableModels(data.models);
          setAiSettings((prev) => ({ ...prev, aiModel: data.currentModel }));
        }
      })
      .catch(() => {});

    // Load automation + aiSettings from user settings JSONB
    fetch('/api/users/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.user?.settings) {
          if (data.user.settings.automation) {
            setAutomation((prev) => ({ ...prev, ...data.user.settings.automation }));
          }
          if (data.user.settings.ai) {
            setAiSettings((prev) => ({ ...prev, ...data.user.settings.ai, aiModel: prev.aiModel }));
          }
        }
      })
      .catch(() => {})
      .finally(() => { setTimeout(() => { agentInitialized.current = true; }, 100); });
  }, []);

  // Auto-save agent settings (automation + aiSettings except aiModel) with debounce
  useEffect(() => {
    if (!agentInitialized.current) return;
    const timer = setTimeout(async () => {
      setAgentSaving(true);
      try {
        // Strip aiModel — that has its own /api/agent-config endpoint
        const { aiModel: _, ...aiOnly } = aiSettings;
        await fetch('/api/users/me', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings: { automation, ai: aiOnly } }),
        });
      } catch (err) {
        console.error('Failed to save agent settings:', err);
      } finally {
        setAgentSaving(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [automation, aiSettings]);

  // Load notifications from backend on mount
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const res = await fetch("/api/users/me");
        const data = await res.json();
        if (data.success && data.user?.settings?.notifications) {
          setNotifications((prev) => ({ ...prev, ...data.user.settings.notifications }));
        }
      } catch (err) {
        console.error("Failed to load notification settings:", err);
      } finally {
        setNotifLoading(false);
        // Mark as initialized after a tick so the save effect skips the first render
        setTimeout(() => { notifInitialized.current = true; }, 0);
      }
    };
    loadNotifications();
  }, []);

  // Auto-save notifications to backend when they change
  useEffect(() => {
    if (!notifInitialized.current) return;
    const saveNotifications = async () => {
      setNotifSaving(true);
      try {
        await fetch("/api/users/me", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ settings: { notifications } }),
        });
        setNotifSaved(true);
        setTimeout(() => setNotifSaved(false), 1500);
      } catch (err) {
        console.error("Failed to save notification settings:", err);
      } finally {
        setNotifSaving(false);
      }
    };
    saveNotifications();
  }, [notifications]);

  // Integrations
  const [integrations, setIntegrations] = useState({
    crm: { type: "hubspot", connected: false, apiKey: "" },
    calendar: { type: "google", connected: false, email: "" },
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
    renewDate: "March 15, 2026",
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
            Settings
          </h1>
          <p className="text-gray-600 mt-1">Configure your LinkedIn agent and preferences</p>
        </div>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-100/50 p-2 rounded-2xl border border-gray-200/50 h-auto">
          <TabsTrigger value="account" className="text-xs sm:text-sm rounded-xl border-2 border-gray-200 bg-white text-gray-500 hover:border-blue-200 hover:text-blue-500 data-[state=active]:border-blue-400 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all px-2 sm:px-3 py-2"><User className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />Account</TabsTrigger>
          <TabsTrigger value="agent" className="text-xs sm:text-sm rounded-xl border-2 border-gray-200 bg-white text-gray-500 hover:border-blue-200 hover:text-blue-500 data-[state=active]:border-blue-400 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all px-2 sm:px-3 py-2"><Bot className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />Agent</TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs sm:text-sm rounded-xl border-2 border-gray-200 bg-white text-gray-500 hover:border-blue-200 hover:text-blue-500 data-[state=active]:border-blue-400 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all px-2 sm:px-3 py-2"><Bell className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">Notifications</span><span className="sm:hidden">Notif</span></TabsTrigger>
          <TabsTrigger value="appearance" className="text-xs sm:text-sm rounded-xl border-2 border-gray-200 bg-white text-gray-500 hover:border-blue-200 hover:text-blue-500 data-[state=active]:border-blue-400 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all px-2 sm:px-3 py-2"><Palette className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />Display</TabsTrigger>
        </TabsList>

        {/* ACCOUNT TAB */}
        <TabsContent value="account" className="space-y-6">
          {/* LinkedIn Connection — Real Component */}
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="h-1 bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-600" />
            <CardHeader className="bg-gradient-to-br from-blue-50/50 to-white border-b border-gray-100">
              <CardTitle className="flex items-center gap-3">
                <User className="w-7 h-7 text-blue-500" />
                <div>
                  <span className="text-lg font-bold text-gray-900">LinkedIn Account</span>
                  <CardDescription className="mt-0.5">Manage your connection and Password</CardDescription>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-6">
                <SecurityPasswordForm />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        

        {/* AGENT TAB — Timing/Behavior + AI together */}
        <TabsContent value="agent" className="space-y-6">
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="h-1 bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-600" />
            <CardHeader className="bg-gradient-to-br from-blue-50/50 to-white border-b border-gray-100">
              <CardTitle className="flex items-center gap-3">
                <Bot className="w-7 h-7 text-blue-500" />
                <div className="flex-1">
                  <span className="text-lg font-bold text-gray-900">Agent</span>
                  <CardDescription className="mt-0.5">AI model, timing and agent behavior</CardDescription>
                </div>
                {agentSaving && (
                  <span className="flex items-center gap-1.5 text-xs text-blue-600 font-medium animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-7 pb-6 space-y-7">
              {/* AI MODEL + TONE — at the very top */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="ai-model" className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">AI Model</label>
                  <div id="ai-model-dropdown" className="relative">
                    <button
                      onClick={() => setAiModelDropdownOpen(!aiModelDropdownOpen)}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 pr-9 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-blue-300 transition-all cursor-pointer text-left"
                    >
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        aiSettings.aiModel === 'gpt-4' ? 'bg-green-500' :
                        aiSettings.aiModel === 'gpt-3.5-turbo' ? 'bg-blue-500' : 'bg-orange-500'
                      }`}></span>
                      <span className="truncate flex-1 text-left">{
                        availableModels.find((m) => m.value === aiSettings.aiModel)?.label || aiSettings.aiModel
                      }</span>
                      {modelSaving && <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin flex-shrink-0" />}
                    </button>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    {aiModelDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                        {(availableModels.length > 0 ? availableModels : [
                          { value: 'gpt-4o-mini', label: 'GPT-4o-mini (Fast & affordable)', color: 'orange', available: false },
                          { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Faster)', color: 'blue', available: false },
                          { value: 'gpt-4', label: 'GPT-4 (Best quality)', color: 'green', available: false },
                        ]).map((model) => (
                          <button
                            key={model.value}
                            disabled={!model.available}
                            onClick={() => {
                              if (!model.available) return;
                              setAiSettings({ ...aiSettings, aiModel: model.value });
                              setAiModelDropdownOpen(false);
                              setModelSaving(true);
                              fetch('/api/agent-config', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ model: model.value }),
                              }).finally(() => setModelSaving(false));
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left ${
                              !model.available
                                ? 'opacity-40 cursor-not-allowed bg-gray-50'
                                : aiSettings.aiModel === model.value
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${{green:'bg-green-500',blue:'bg-blue-500',orange:'bg-orange-500'}[model.color] || 'bg-gray-400'}`}></span>
                            <span className="truncate flex-1">{model.label}</span>
                            {!model.available && <Lock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
                            {model.available && aiSettings.aiModel === model.value && <Check className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
                          </button>
                        ))}
                        {!availableModels.some((m) => m.available) && (
                          <p className="px-4 py-2 text-xs text-orange-500 border-t border-gray-100">
                            ⚠️ Ajoutez OPENAI_API_KEY dans .env.local
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label htmlFor="ai-tone" className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Message Tone</label>
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
                        aiSettings.tone === 'professional' ? 'Professional' :
                        aiSettings.tone === 'friendly' ? 'Friendly' :
                        aiSettings.tone === 'formal' ? 'Formal' : 'Casual'
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
                          { value: 'professional', label: 'Professional', color: 'bg-blue-500' },
                          { value: 'friendly', label: 'Friendly', color: 'bg-green-500' },
                          { value: 'formal', label: 'Formal', color: 'bg-purple-500' },
                          { value: 'casual', label: 'Casual', color: 'bg-orange-500' }
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-xl">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Min delay between actions: <span className="text-blue-600 font-bold">{automation.minDelayBetweenActions}s</span>
                  </label>
                  <Slider
                    value={[automation.minDelayBetweenActions]}
                    onValueChange={([v]: number[]) => setAutomation({ ...automation, minDelayBetweenActions: v })}
                    max={300}
                    min={10}
                    step={5}
                  />
                </div>
                <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-xl">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Max delay between actions: <span className="text-blue-600 font-bold">{automation.maxDelayBetweenActions}s</span>
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="auto-start" className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Start time</label>
                  <input
                    id="auto-start"
                    aria-label="Start time"
                    type="text"
                    placeholder="09:00"
                    pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$"
                    maxLength={5}
                    value={automation.workingHoursStart}
                    onChange={(e) => setAutomation({ ...automation, workingHoursStart: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 hover:border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-xl text-sm transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="auto-end" className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">End time</label>
                  <input
                    id="auto-end"
                    aria-label="End time"
                    type="text"
                    placeholder="18:00"
                    pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$"
                    maxLength={5}
                    value={automation.workingHoursEnd}
                    onChange={(e) => setAutomation({ ...automation, workingHoursEnd: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 hover:border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-xl text-sm transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="auto-timezone" className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Timezone</label>
                  <Dropdown
                    ariaLabel="Timezone"
                    value={automation.timezone}
                    onChange={(v) => setAutomation({ ...automation, timezone: v })}
                    options={[
                      { value: "Europe/Paris (UTC+1)", label: "Europe/Paris (UTC+1)", color: "bg-blue-500" },
                      { value: "Europe/London (UTC+0)", label: "Europe/London (UTC+0)", color: "bg-indigo-500" },
                      { value: "America/New_York (UTC-5)", label: "America/New_York (UTC-5)", color: "bg-purple-500" },
                      { value: "America/Los_Angeles (UTC-8)", label: "America/Los_Angeles (UTC-8)", color: "bg-pink-500" },
                      { value: "Asia/Tokyo (UTC+9)", label: "Asia/Tokyo (UTC+9)", color: "bg-amber-500" },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Prospecting days</label>
                  <div className="flex gap-1 flex-wrap">
                    {[
                      { fr: "Mon", en: "Mon" },
                      { fr: "Tue", en: "Tue" },
                      { fr: "Wed", en: "Wed" },
                      { fr: "Thu", en: "Thu" },
                      { fr: "Fri", en: "Fri" },
                      { fr: "Sat", en: "Sat" },
                      { fr: "Sun", en: "Sun" },
                    ].map((day) => {
                      const active = automation.workingDays.includes(day.en);
                      return (
                        <button
                          key={day.en}
                          type="button"
                          onClick={() => setAutomation({
                            ...automation,
                            workingDays: active
                              ? automation.workingDays.filter((d) => d !== day.en)
                              : [...automation.workingDays, day.en],
                          })}
                          className={`flex-1 min-w-[34px] h-9 px-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                            active
                              ? "bg-blue-600 text-white shadow-sm"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          {day.fr}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Randomize delays</p>
                    <p className="text-sm text-gray-500">Vary delays between actions to simulate a human</p>
                  </div>
                  <Switch
                    checked={automation.randomizeDelays}
                    onCheckedChange={(v: boolean) => setAutomation({ ...automation, randomizeDelays: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Simulated human behavior</p>
                    <p className="text-sm text-gray-500">Profile visits, scrolling, variable reading time</p>
                  </div>
                  <Switch
                    checked={automation.simulateHumanBehavior}
                    onCheckedChange={(v: boolean) => setAutomation({ ...automation, simulateHumanBehavior: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Automatic AI replies</p>
                    <p className="text-sm text-gray-500">AI automatically replies to received messages</p>
                  </div>
                  <Switch
                    checked={aiSettings.autoReplyEnabled}
                    onCheckedChange={(v: boolean) => setAiSettings({ ...aiSettings, autoReplyEnabled: v })}
                  />
                </div>
                {aiSettings.autoReplyEnabled && (
                  <div className="pl-4 border-l-2 border-blue-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum confidence: <span className="text-blue-600 font-bold">{aiSettings.autoReplyConfidence}%</span>
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
                    <p className="font-medium text-gray-900">Automatic language detection</p>
                    <p className="text-sm text-gray-500">Adapt language based on the prospect's profile</p>
                  </div>
                  <Switch
                    checked={aiSettings.autoDetectLanguage}
                    onCheckedChange={(v: boolean) => setAiSettings({ ...aiSettings, autoDetectLanguage: v })}
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
            <div className="h-1 bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-600" />
            <CardHeader className="bg-gradient-to-br from-blue-50/50 to-white border-b border-gray-100">
              <CardTitle className="flex items-center gap-3">
                <Bell className="w-7 h-7 text-blue-500" />
                <div className="flex-1">
                  <span className="text-lg font-bold text-gray-900">Extension alerts</span>
                  <CardDescription className="mt-0.5">Choose which events trigger a notification in the popup</CardDescription>
                </div>
                {notifSaving && (
                  <span className="flex items-center gap-1.5 text-xs text-blue-600 font-medium animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </span>
                )}
                {notifSaved && !notifSaving && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Saved
                  </motion.span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {notifLoading ? (
                <div className="space-y-3">
                  {[1,2,3,4].map((i) => (
                    <div key={i} className="flex items-center justify-between gap-4 px-4 py-4 rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-200 rounded-xl animate-pulse" />
                        <div className="space-y-2">
                          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                          <div className="h-3 w-48 bg-gray-100 rounded animate-pulse" />
                        </div>
                      </div>
                      <div className="h-6 w-10 bg-gray-200 rounded-full animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (
              <div className="space-y-1">
                {[
                  {
                    key: "emailNewReply",
                    label: "New reply",
                    desc: "Get notified when a prospect replies",
                    icon: MessageSquare,
                    iconBg: "bg-blue-50",
                    iconColor: "text-blue-600",
                  },
                  {
                    key: "emailNewConversion",
                    label: "New conversion",
                    desc: "Immediate alert for each conversion",
                    icon: TrendingUp,
                    iconBg: "bg-emerald-50",
                    iconColor: "text-emerald-600",
                  },
                  {
                    key: "emailLimitWarning",
                    label: "Limit alert",
                    desc: "Warning when you approach LinkedIn limits",
                    icon: AlertTriangle,
                    iconBg: "bg-amber-50",
                    iconColor: "text-amber-600",
                  },
                  {
                    key: "emailDailySummary",
                    label: "Daily summary",
                    desc: "Summary of the day's actions in the popup",
                    icon: BarChart3,
                    iconBg: "bg-indigo-50",
                    iconColor: "text-indigo-600",
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.key}
                      className="group flex items-center justify-between gap-4 px-4 py-4 rounded-xl hover:bg-gray-50/70 transition-colors"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`w-10 h-10 ${item.iconBg} rounded-xl flex items-center justify-center shrink-0`}>
                          <Icon className={`w-5 h-5 ${item.iconColor}`} strokeWidth={2} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 text-sm">{item.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                      <Switch
                        checked={notifications[item.key as keyof typeof notifications] as boolean}
                        onCheckedChange={(v: boolean) => setNotifications({ ...notifications, [item.key]: v })}
                      />
                    </div>
                  );
                })}
              </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* APPEARANCE TAB */}
        <TabsContent value="appearance" className="space-y-6">
          {/* Theme Selection - Creative Cards */}
          <Card className="border-0 shadow-lg overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-600" />
            <CardHeader className="bg-gradient-to-br from-blue-50/50 to-white border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Palette className="w-7 h-7 text-blue-500" />
                  <div>
                    <span className="text-lg font-bold text-gray-900">Visual customization</span>
                    <CardDescription className="mt-0.5">Choose the appearance that suits you best</CardDescription>
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
                  Reset preferences
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              {/* Theme Preview Cards */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-blue-500" />
                  Interface theme
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { 
                      value: "light", 
                      label: "Light", 
                      desc: "Bright and clean interface",
                      icon: Sun,
                      preview: "bg-white",
                      accent: "bg-blue-500",
                      textColor: "text-gray-900"
                    },
                    { 
                      value: "dark", 
                      label: "Dark", 
                      desc: "Night mode, easier on the eyes",
                      icon: Moon,
                      preview: "bg-gray-900",
                      accent: "bg-purple-500",
                      textColor: "text-white"
                    },
                    { 
                      value: "auto", 
                      label: "Auto", 
                      desc: "Adapts to the time of day",
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
                        onClick={() => setAppearance({ ...appearance, theme: t.value as "light" | "dark" | "auto" })}
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
                  Language and Date
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Language Selection */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-500">Language</label>
                  <div className="flex gap-2">
                    {[
                      { value: "fr", label: "FR", desc: "Français" },
                      { value: "en", label: "EN", desc: "English" },
                    ].map((lang) => (
                      <button
                        key={lang.value}
                        onClick={() => setAppearance({ ...appearance, language: lang.value as "fr" | "en" })}
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
                  <label className="block text-xs font-medium text-gray-500">Date format</label>
                  <div className="flex gap-2">
                    {[
                      { value: "DD/MM/YYYY", label: "31/12/2024", badge: "EU" },
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
                  <label className="block text-xs font-medium text-gray-500">Time format</label>
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

// =============================================================
// SecurityPasswordForm — Multi-admin SaaS
// -------------------------------------------------------------
// Permet à l'utilisateur connecté (admin ou user secondaire)
// de définir / modifier son mot de passe. Le backend gère
// l'ancien mdp (requis seulement s'il existe déjà).
// =============================================================
function SecurityPasswordForm() {
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPwd.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPwd !== confirmPwd) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          currentPassword: currentPwd || undefined,
          newPassword: newPwd,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(data.message || "Password updated successfully!");
        setCurrentPwd("");
        setNewPwd("");
        setConfirmPwd("");
      } else {
        setError(data.error || "Failed to update password.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Current password</label>
        <div className="relative">
          <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type={showCurrent ? "text" : "password"}
            value={currentPwd}
            onChange={(e) => setCurrentPwd(e.target.value)}
            placeholder="Leave blank if you never set one"
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
          />
          <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[11px] text-gray-400 mt-1">
          Optional if you connected via LinkedIn and never set a password before.
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">New password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type={showNew ? "text" : "password"}
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            placeholder="Min. 8 characters"
            required
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
          />
          <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Confirm new password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type={showConfirm ? "text" : "password"}
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
            placeholder="Re-enter new password"
            required
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
          />
          <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Button
          type="submit"
          disabled={loading || !newPwd || newPwd !== confirmPwd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {loading ? "Saving..." : "Update password"}
        </Button>
      </div>
    </form>
  );
}
