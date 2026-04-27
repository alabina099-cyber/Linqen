"use client";

import { useState, useEffect } from "react";
import { LayoutDashboard, Users, Target, Settings, Activity, Menu, X, Bot, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { t } = useSettings();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const menuItems = [
    { id: "dashboard", label: t("Tableau de bord", "Dashboard"), icon: LayoutDashboard },
    { id: "prospects", label: "Prospects", icon: Users },
    { id: "campaigns", label: t("Campagnes", "Campaigns"), icon: Target },
    { id: "approval", label: t("Approbations", "Approvals"), icon: Clock },
    { id: "agent", label: t("Agent IA", "AI Agent"), icon: Bot },
    { id: "settings", label: t("Paramètres", "Settings"), icon: Settings },
  ];

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    if (isMobile) {
      setIsMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">LinkedIn Agent</h1>
          </div>
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 tap-target"
            aria-label={isMobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
          >
            {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobile && isMobileOpen && (
        <div 
          className="mobile-overlay lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar - Desktop fixed, Mobile slide-over */}
      <div
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out",
          isMobile ? (isMobileOpen ? "translate-x-0" : "-translate-x-full") : "",
          "w-64 lg:translate-x-0"
        )}
      >
        {/* Logo Section - Desktop only */}
        <div className="hidden lg:block p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">LinkedIn Agent</h1>
              <p className="text-xs text-gray-500">{t("Prospection Autonome", "Autonomous Prospecting")}</p>
            </div>
          </div>
        </div>

        {/* Spacer for mobile */}
        <div className="lg:hidden h-14" />

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 touch-scroll">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors tap-target",
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-50"
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Beta Badge */}
        <div className="p-4 border-t border-gray-200">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-xs font-semibold text-blue-900 mb-1">Version Beta</p>
            <p className="text-xs text-blue-700">
              {t("Interface de visualisation du projet LinkedIn Agent", "LinkedIn Agent project visualization interface")}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
