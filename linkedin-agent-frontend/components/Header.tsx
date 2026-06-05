"use client";

import { useState, useEffect } from "react";
import { Settings, LayoutDashboard, Users, Target, Clock, Bot, Shield, LogOut } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import NotificationPanel from "./NotificationPanel";

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Header({ activeTab, setActiveTab }: HeaderProps) {
  const { t } = useSettings();
  const { user, isAdmin, logout } = useAuth();
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

  // Affichage nom/email selon le type d'utilisateur
  const displayName = user?.name || linkedInUser.name || 'Utilisateur';
  const displayEmail = user?.email || linkedInUser.email || '';
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const goToSettings = () => {
    setActiveTab("settings");
    window.location.hash = "settings";
  };

  // Navigation adaptative selon le rôle
  const baseNav = [
    { id: "prospects", label: "Prospects", icon: Users },
    { id: "campaigns", label: t("Campagnes", "Campaigns"), icon: Target },
    { id: "approval", label: t("Approbations", "Approvals"), icon: Clock },
    { id: "agent", label: t("Agent IA", "AI Agent"), icon: Bot },
  ];

  const adminNav = [
    { id: "dashboard", label: t("Tableau de bord", "Dashboard"), icon: LayoutDashboard },
    ...baseNav,
    { id: "users", label: "Users", icon: Shield },
  ];

  const navItems = isAdmin ? adminNav : baseNav;

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm">
      <div className="flex items-center justify-between px-4 lg:px-6 h-[75px]">
        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <img
            src="/qlinqen-logo.png"
            alt="Qlinqen"
            className="h-10 w-auto object-contain"
          />
          
        </div>

        {/* Navigation — Center */}
        <nav className="flex items-center gap-1 px-2 py-2 bg-gray-50/80 rounded-2xl border border-gray-100">
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
                  relative flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ease-out whitespace-nowrap
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
          <div className="w-px h-15 bg-gray-200 mx-1 hidden sm:block" />

          {/* User */}
          <div className="flex items-center gap-2.5">
            <div className="hidden md:block text-right">
              <p className="text-sm font-semibold text-gray-800 leading-tight">{displayName}</p>
              <div className="flex items-center justify-end gap-1.5">
                {user?.role && (
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                    isAdmin
                      ? "bg-blue-50 text-blue-600 border border-blue-100"
                      : "bg-indigo-50 text-indigo-600 border border-indigo-100"
                  }`}>
                    {isAdmin ? "Admin" : "Membre"}
                  </span>
                )}
                {displayEmail && <span className="text-[11px] text-gray-400">{displayEmail}</span>}
              </div>
            </div>
            <button
              onClick={logout}
              title="Déconnexion"
              className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
            >
              <LogOut className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
