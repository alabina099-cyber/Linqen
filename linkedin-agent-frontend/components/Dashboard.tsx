"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp, Zap, Calendar, LayoutDashboard } from "lucide-react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import StatsCards from "./StatsCards";
import PerformanceCharts from "./PerformanceCharts";
import ProspectsPipeline from "./ProspectsPipeline";
import RecentActivity from "./RecentActivity";
import Messages from "./Messages";
import Campaigns from "./Campaigns";
import Settings from "./Settings";
import AgentChat from "./AgentChat";
import ApprovalQueue from "./ApprovalQueue";
import LinkedInAccount from "./LinkedInAccount";

function DashboardHeader() {
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const greeting = new Date().getHours() < 12 ? "Bonjour" : new Date().getHours() < 18 ? "Bon après-midi" : "Bonsoir";
  const [growthPercent, setGrowthPercent] = useState(0);

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
            Dashboard
          </h1>
          <p className="text-sm lg:text-base text-gray-600 mt-2">
            <span className="hidden sm:inline">Voici votre performance de prospection LinkedIn aujourd'hui</span>
            <span className="sm:hidden">Performance LinkedIn aujourd'hui</span>
          </p>
        </div>

        <div className="flex flex-col items-end gap-3">
          {/* Date aligned with Système actif */}
          <div className="flex items-center gap-2 lg:gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">{today}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 lg:px-4 lg:py-2 bg-green-50 rounded-xl border border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs lg:text-sm font-medium text-green-700">Système actif</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 lg:px-4 lg:py-2 bg-blue-50 rounded-xl border border-blue-200">
              <TrendingUp className="w-3 h-3 lg:w-4 lg:h-4 text-blue-600" />
              <span className="text-xs lg:text-sm font-medium text-blue-700">+{growthPercent}% ce mois</span>
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
    const validTabs = ["dashboard", "prospects", "campaigns", "messages", "approval", "linkedin-account", "agent", "settings"];
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
    <div className="flex h-screen bg-gray-50">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className={`flex-1 min-h-0 ${activeTab === "agent" ? "overflow-hidden" : "overflow-y-auto p-3 sm:p-4 lg:p-6"}`}>
          {activeTab === "dashboard" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="space-y-4 sm:space-y-6 max-w-7xl mx-auto"
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

          {activeTab === "messages" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Messages />
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

          {activeTab === "linkedin-account" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <LinkedInAccount />
            </motion.div>
          )}

          {activeTab === "agent" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full w-full p-3 sm:p-4 lg:p-6">
              <AgentChat />
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
}
