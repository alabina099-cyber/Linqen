"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  UserPlus, Mail, MessageSquareReply, Target,
  Wand2, Star, ArrowUp, ArrowDown, Minus,
} from "lucide-react";
import { BIRange, fmt } from "./biTypes";

interface KPIHeroProps {
  range: BIRange;
}

interface KPIData {
  prospects: { value: number; delta: number };
  messages: { value: number; delta: number };
  replyRate: { value: number; delta: number };
  conversions: { value: number; delta: number };
  avgScore: { value: number };
  agentActions: { value: number; delta: number };
}

function DeltaPill({ delta, suffix = "%" }: { delta: number; suffix?: string }) {
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-gray-500">
        <Minus className="w-3 h-3" /> 0{suffix}
      </span>
    );
  }
  const positive = delta > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${
        positive ? "text-emerald-600" : "text-rose-600"
      }`}
    >
      {positive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {Math.abs(delta)}{suffix}
    </span>
  );
}

export default function KPIHero({ range }: KPIHeroProps) {
  const [data, setData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    fetch(`/api/bi/kpi?range=${range}`)
      .then(r => r.json())
      .then(j => {
        if (!cancel && j.success) setData(j.kpis);
      })
      .catch(() => {})
      .finally(() => !cancel && setLoading(false));
    return () => { cancel = true; };
  }, [range]);

  const cards = [
    {
      label: "Nouveaux prospects",
      value: data?.prospects.value ?? 0,
      delta: data?.prospects.delta ?? 0,
      icon: UserPlus,
      gradient: "from-blue-500 to-cyan-500",
      bg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      label: "Messages envoyés",
      value: data?.messages.value ?? 0,
      delta: data?.messages.delta ?? 0,
      icon: Mail,
      gradient: "from-indigo-500 to-purple-500",
      bg: "bg-indigo-50",
      iconColor: "text-indigo-600",
    },
    {
      label: "Taux de réponse",
      value: data?.replyRate.value ?? 0,
      delta: data?.replyRate.delta ?? 0,
      icon: MessageSquareReply,
      gradient: "from-violet-500 to-fuchsia-500",
      bg: "bg-violet-50",
      iconColor: "text-violet-600",
      suffix: "%",
      deltaSuffix: "pts",
    },
    {
      label: "Conversions",
      value: data?.conversions.value ?? 0,
      delta: data?.conversions.delta ?? 0,
      icon: Target,
      gradient: "from-emerald-500 to-green-500",
      bg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      label: "Actions agent IA",
      value: data?.agentActions.value ?? 0,
      delta: data?.agentActions.delta ?? 0,
      icon: Wand2,
      gradient: "from-purple-500 to-pink-500",
      bg: "bg-purple-50",
      iconColor: "text-purple-600",
    },
    {
      label: "Score moyen ICP",
      value: data?.avgScore.value ?? 0,
      delta: 0,
      icon: Star,
      gradient: "from-amber-500 to-orange-500",
      bg: "bg-amber-50",
      iconColor: "text-amber-600",
      suffix: "/100",
      hideDelta: true,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="relative overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-4"
            >
              <div className={`absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br ${c.gradient} opacity-10 rounded-full blur-2xl`} />
              <div className="flex items-start justify-between mb-2">
                <div className={`w-9 h-9 ${c.bg} rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-4.5 h-4.5 ${c.iconColor}`} />
                </div>
                {!c.hideDelta && <DeltaPill delta={c.delta} suffix={c.deltaSuffix || "%"} />}
              </div>
              <div className="text-[11px] uppercase tracking-wide font-semibold text-gray-500 mb-1">
                {c.label}
              </div>
              <div className="text-2xl font-bold text-gray-900 tabular-nums">
                {loading ? (
                  <div className="h-7 w-16 bg-gray-100 rounded animate-pulse" />
                ) : (
                  <>{fmt(c.value)}{c.suffix || ""}</>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

    </div>
  );
}
