"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Calendar, LayoutDashboard, Printer,
} from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { BIRange, RANGE_OPTIONS } from "./biTypes";
import KPIHero from "./KPIHero";
import ConversionIntelligence from "./ConversionIntelligence";
import TemplateLab from "./TemplateLab";
import ProspectMap from "./ProspectMap";
import AgentAnalytics from "./AgentAnalytics";
import Forecast from "./Forecast";
import AIInsights from "./AIInsights";

export default function BIShell() {
  const { t, formatDate } = useSettings();
  const [range, setRange] = useState<BIRange>(30);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => { setNow(new Date()); }, []);

  const handlePrint = () => window.print();

  return (
    <div className="space-y-5 print:space-y-3">
      {/* Header BI */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 print:flex-row"
      >
        <div>
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-blue-600 shrink-0" />
            <h1 className="text-3xl font-bold text-gray-900">
              {t("Tableau de bord", "Dashboard")}
            </h1>
          </div>
          <p className="text-base text-gray-500">
            {t(
              "Voici votre performance de prospection LinkedIn aujourd'hui",
              "Here's your LinkedIn prospecting performance today"
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period filter */}
          <div className="flex items-center gap-1 px-2 py-1.5 bg-white border border-gray-200 rounded-xl shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-gray-400 ml-1" />
            {RANGE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  range === opt.value
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Export buttons */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl shadow-sm text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:shadow-md transition-all print:hidden"
            title="Imprimer / Exporter en PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PDF</span>
          </button>

          {now && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] font-semibold text-emerald-700">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span>{formatDate(now)}</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* KPI Hero */}
      <KPIHero range={range} />

      {/* AI Insights narration */}
      <AIInsights range={range} />

      {/* Module 1: Conversion Intelligence */}
      <ConversionIntelligence range={range} />

      {/* Two-column wide modules */}
      <div className="grid grid-cols-1 gap-5">
        {/* Module 2: Template Lab */}
        <TemplateLab range={range} />

        {/* Module 3: Prospect Map */}
        <ProspectMap range={range} />

        {/* Module 4: Agent Analytics */}
        <AgentAnalytics range={range} />

        {/* Module 5: Forecast */}
        <Forecast range={range} />
      </div>

    </div>
  );
}
