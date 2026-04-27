"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface SettingsState {
  theme: "light" | "dark" | "auto";
  language: "fr" | "en";
  dateFormat: string;
  timeFormat: string;
}

interface SettingsContextType {
  settings: SettingsState;
  updateSettings: (partial: Partial<SettingsState>) => void;
  resetSettings: () => void;
  t: (fr: string, en: string) => string;
  formatDate: (date: Date | string) => string;
  formatTime: (date: Date | string) => string;
}

const defaultSettings: SettingsState = {
  theme: "light",
  language: "fr",
  dateFormat: "DD/MM/YYYY",
  timeFormat: "24h",
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("app-settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings({ ...defaultSettings, ...parsed });
      }
    } catch {
      // ignore
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("app-settings", JSON.stringify(settings));
    }
  }, [settings, mounted]);

  // Apply theme
  useEffect(() => {
    if (!mounted) return;

    const applyTheme = (theme: "light" | "dark") => {
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };

    if (settings.theme === "auto") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      applyTheme(mq.matches ? "dark" : "light");
      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches ? "dark" : "light");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    } else {
      applyTheme(settings.theme);
    }
  }, [settings.theme, mounted]);

  // Apply language on html tag
  useEffect(() => {
    if (mounted) {
      document.documentElement.lang = settings.language;
    }
  }, [settings.language, mounted]);

  const updateSettings = useCallback((partial: Partial<SettingsState>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
  }, []);

  // Simple translation helper
  const t = useCallback((fr: string, en: string): string => {
    return settings.language === "en" ? en : fr;
  }, [settings.language]);

  // Format date
  const formatDate = useCallback((date: Date | string): string => {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return String(date);

    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();

    const monthNames: Record<string, string[]> = {
      fr: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
      en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    };

    switch (settings.dateFormat) {
      case "MM/DD/YYYY":
        return `${month}/${day}/${year}`;
      case "YYYY-MM-DD":
        return `${year}-${month}-${day}`;
      case "DD MMMM YYYY":
        return `${d.getDate()} ${monthNames[settings.language]?.[d.getMonth()] || monthNames.fr[d.getMonth()]} ${year}`;
      case "DD/MM/YYYY":
      default:
        return `${day}/${month}/${year}`;
    }
  }, [settings.dateFormat, settings.language]);

  // Format time
  const formatTime = useCallback((date: Date | string): string => {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return String(date);

    if (settings.timeFormat === "12h") {
      const hours = d.getHours();
      const minutes = d.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      const h12 = hours % 12 || 12;
      return `${h12}:${minutes} ${ampm}`;
    }
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  }, [settings.timeFormat]);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings, t, formatDate, formatTime }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within a SettingsProvider");
  return ctx;
}
