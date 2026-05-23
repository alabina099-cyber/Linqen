"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Calendar, LayoutDashboard } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import Header from "./Header";
import StatsCards from "./StatsCards";
import PerformanceCharts from "./PerformanceCharts";
import ProspectsPipeline from "./ProspectsPipeline";
import RecentActivity from "./RecentActivity";
import Campaigns from "./Campaigns";
import Settings from "./Settings";
import AgentChat from "./AgentChat";
import ApprovalQueue from "./ApprovalQueue";

function DashboardHeader() {
  const { t, formatDate, formatTime, settings } = useSettings();
  const now = new Date();
  const todayFormatted = formatDate(now);
  const timeFormatted = formatTime(now);
  const [growthPercent, setGrowthPercent] = useState(0);
  const [currentTime, setCurrentTime] = useState(timeFormatted);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(formatTime(new Date())), 30000);
    return () => clearInterval(timer);
  }, [formatTime]);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        if (data.success && data.stats.growthPercent) {
          setGrowthPercent(data.stats.growthPercent);
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      }
    }

    fetchStats();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-6 lg:mb-8"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <LayoutDashboard className="w-8 h-8 text-blue-600" />
            {t("Tableau de bord", "Dashboard")}
          </h1>
          <p className="text-sm lg:text-base text-gray-600 mt-2">
            <span className="hidden sm:inline">{t("Voici votre performance de prospection LinkedIn aujourd'hui", "Here is your LinkedIn prospecting performance today")}</span>
            <span className="sm:hidden">{t("Performance LinkedIn aujourd'hui", "LinkedIn performance today")}</span>
          </p>
        </div>

        <div className="flex flex-col items-end gap-3">
          {/* Date aligned with Système actif */}
          <div className="flex items-center gap-2 lg:gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">{todayFormatted} • {currentTime}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 lg:px-4 lg:py-2 bg-green-50 rounded-xl border border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs lg:text-sm font-medium text-green-700">{t("Système actif", "System active")}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 lg:px-4 lg:py-2 bg-blue-50 rounded-xl border border-blue-200">
              <TrendingUp className="w-3 h-3 lg:w-4 lg:h-4 text-blue-600" />
              <span className="text-xs lg:text-sm font-medium text-blue-700">+{growthPercent}% {t("ce mois", "this month")}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    const validTabs = ["dashboard", "prospects", "campaigns", "approval", "agent", "settings"];
    if (hash && validTabs.includes(hash)) {
      setActiveTab(hash);
    }

    const onHashChange = () => {
      const newHash = window.location.hash.replace("#", "");
      if (newHash && validTabs.includes(newHash)) {
        setActiveTab(newHash);
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        
        <main className={`flex-1 min-h-0 ${activeTab === "agent" ? "overflow-hidden" : "overflow-y-auto p-3 sm:p-4 lg:p-6"}`}>
          {activeTab === "dashboard" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="space-y-4 sm:space-y-6 w-full"
            >
              <DashboardHeader />
              <StatsCards />
              <PerformanceCharts />
              <RecentActivity />
            </motion.div>
          )}

          {activeTab === "prospects" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <ProspectsPipeline fullView />
            </motion.div>
          )}

          {activeTab === "campaigns" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Campaigns />
            </motion.div>
          )}


          {activeTab === "settings" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Settings />
            </motion.div>
          )}

          {activeTab === "approval" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <ApprovalQueue />
            </motion.div>
          )}


          {activeTab === "agent" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full w-full">
              <AgentChat />
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
}
