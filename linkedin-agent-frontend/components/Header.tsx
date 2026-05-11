"use client";

import { useState, useEffect } from "react";
import { Settings, LayoutDashboard, Users, Target, Clock, Bot, Activity } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import NotificationPanel from "./NotificationPanel";

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Header({ activeTab, setActiveTab }: HeaderProps) {
  const { t } = useSettings();
  const [linkedInUser, setLinkedInUser] = useState<{ connected: boolean; name: string | null; email: string | null }>({ connected: false, name: null, email: null });

  useEffect(() => {
    async function fetchLinkedInAccount() {
      try {
        const res = await fetch('/api/linkedin-auth');
        const data = await res.json();
        setLinkedInUser({ connected: data.connected, name: data.name, email: data.email });
      } catch (e) {
        console.error('Error fetching LinkedIn account:', e);
      }
    }
    fetchLinkedInAccount();
  }, []);

  const displayName = linkedInUser.name || (linkedInUser.connected ? 'Compte LinkedIn' : 'Non connecté');
  const displayEmail = linkedInUser.email || '';
  const initials = linkedInUser.name
    ? linkedInUser.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : linkedInUser.connected ? 'LI' : '?';

  const goToSettings = () => {
    setActiveTab("settings");
    window.location.hash = "settings";
  };

  const navItems = [
    { id: "dashboard", label: t("Tableau de bord", "Dashboard"), icon: LayoutDashboard },
    { id: "prospects", label: "Prospects", icon: Users },
    { id: "campaigns", label: t("Campagnes", "Campaigns"), icon: Target },
    { id: "approval", label: t("Approbations", "Approvals"), icon: Clock },
    { id: "agent", label: t("Agent IA", "AI Agent"), icon: Bot },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm">
      <div className="flex items-center justify-between px-4 lg:px-6 h-16">
        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200/50">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-base font-bold text-gray-900 leading-tight">LinkedIn Agent</h1>
            <p className="text-[10px] text-gray-400 font-medium tracking-wide">{t("Prospection Autonome", "Autonomous Prospecting")}</p>
          </div>
        </div>

        {/* Navigation — Center */}
        <nav className="flex items-center gap-1 px-1.5 py-1.5 bg-gray-50/80 rounded-2xl border border-gray-100">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  window.location.hash = item.id;
                }}
                className={`
                  relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ease-out whitespace-nowrap
                  ${isActive
                    ? "bg-white text-blue-700 shadow-md shadow-blue-100/50"
                    : "text-gray-500 hover:text-gray-800 hover:bg-white/60"
                  }
                `}
              >
                <Icon className={`w-4 h-4 transition-colors duration-300 ${isActive ? "text-blue-600" : ""}`} />
                <span className="hidden lg:inline">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: Settings + Notifications + User */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Notification & Settings icons — same style */}
          <div className="flex items-center gap-1">
            <NotificationPanel />

            <button
              onClick={goToSettings}
              aria-label="Paramètres"
              className={`p-2 rounded-xl transition-all duration-200 ${
                activeTab === "settings"
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-400 hover:text-blue-600 hover:bg-blue-50/60"
              }`}
            >
              <Settings className="w-[18px] h-[18px]" />
            </button>
          </div>

          {/* Separator */}
          <div className="w-px h-7 bg-gray-200 mx-1 hidden sm:block" />

          {/* User */}
          <div className="flex items-center gap-2.5">
            <div className="hidden md:block text-right">
              <p className="text-sm font-semibold text-gray-800 leading-tight">{displayName}</p>
              {displayEmail && <p className="text-[11px] text-gray-400">{displayEmail}</p>}
            </div>
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xs ring-2 ring-white shadow-lg shadow-indigo-200/40">
              {initials}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
