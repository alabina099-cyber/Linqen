"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  ResponsiveContainer, Tooltip as RTooltip, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Legend, ReferenceLine,
} from "recharts";
import { TrendingUp, AlertTriangle, Telescope, SlidersHorizontal, CheckCircle2, Info } from "lucide-react";
import { BIRange } from "./biTypes";

interface HistPoint {
  day: string; x: number;
  newProspects: number; messages: number; replies: number; conversions: number;
}
interface ProjPoint extends Omit<HistPoint, "x"> {
  forecast: boolean;
}
interface Regression { slope: number; intercept: number; }
interface Alert { type: "positive" | "warning" | "info"; title: string; message: string; }

interface ForecastResp {
  history: HistPoint[];
  projection: ProjPoint[];
  regression: { prospects: Regression; messages: Regression; replies: Regression; conversions: Regression; };
  summary: { totalConversions: number; projectedConversions: number; avgDailyConversions: number; avgReplyRate: number; };
  alerts: Alert[];
}

const ALERT_STYLES: Record<Alert["type"], { bg: string; border: string; text: string; icon: any }> = {
  positive: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", icon: CheckCircle2 },
  warning: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-800", icon: AlertTriangle },
  info: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", icon: Info },
};

export default function Forecast({ range }: { range: BIRange }) {
  const [data, setData] = useState<ForecastResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [whatIfBoost, setWhatIfBoost] = useState(0); // % boost messages quotidiens

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    fetch(`/api/bi/forecast?range=${range}&horizon=30`)
      .then(r => r.json())
      .then(j => {
        if (cancel || !j.success) return;
        setData(j);
      })
      .finally(() => !cancel && setLoading(false));
    return () => { cancel = true; };
  }, [range]);

  // Combiner history + projection (avec what-if boost)
  const chartData = useMemo(() => {
    if (!data) return [];
    const factor = 1 + whatIfBoost / 100;
    const hist = data.history.map(h => ({
      day: h.day,
      historical: h.conversions,
      projected: null as number | null,
      boosted: null as number | null,
    }));
    const proj = data.projection.map(p => ({
      day: p.day,
      historical: null as number | null,
      projected: p.conversions,
      boosted: Math.round(p.conversions * factor),
    }));
    return [...hist, ...proj];
  }, [data, whatIfBoost]);

  const projectedTotal = data?.projection.reduce((s, p) => s + p.conversions, 0) || 0;
  const boostedTotal = Math.round(projectedTotal * (1 + whatIfBoost / 100));

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-cyan-50 via-sky-50 to-blue-50 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Predictive Forecast</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                Projection 30 jours • alertes intelligentes • simulateur what-if
              </p>
            </div>
          </div>
          {data && (
            <Badge className="bg-cyan-100 text-cyan-700 border-0">
              Projection: ~{projectedTotal} conversions / 30j
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Alerts */}
        {data && data.alerts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {data.alerts.map((a, i) => {
              const s = ALERT_STYLES[a.type];
              const Icon = s.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`${s.bg} ${s.border} ${s.text} border rounded-xl p-3 flex items-start gap-2`}
                >
                  <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="text-xs">
                    <div className="font-semibold">{a.title}</div>
                    <div className="opacity-90 mt-0.5">{a.message}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Forecast chart */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <Telescope className="w-4 h-4 text-cyan-500" />
            Conversions: historique + projection 30 jours
          </h4>
          <div style={{ height: 320 }} className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100 p-3">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="boostGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 10 }}
                    tickFormatter={(v) => new Date(v).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                  <RTooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                    labelFormatter={(v) => new Date(v).toLocaleDateString("fr-FR")}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine
                    x={data?.history[data.history.length - 1]?.day}
                    stroke="#94a3b8"
                    strokeDasharray="4 4"
                    label={{ value: "Aujourd'hui", fontSize: 10, fill: "#64748b" }}
                  />
                  <Area type="monotone" dataKey="historical" stroke="#10b981" strokeWidth={2.5} fill="url(#histGrad)" name="Historique" connectNulls={false} />
                  <Area type="monotone" dataKey="projected" stroke="#06b6d4" strokeWidth={2} strokeDasharray="6 4" fill="url(#projGrad)" name="Projection" connectNulls={false} />
                  {whatIfBoost !== 0 && (
                    <Area type="monotone" dataKey="boosted" stroke="#a855f7" strokeWidth={2.5} strokeDasharray="3 3" fill="url(#boostGrad)" name={`What-if ${whatIfBoost > 0 ? "+" : ""}${whatIfBoost}%`} connectNulls={false} />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-gray-400">
                Pas assez de données pour projeter
              </div>
            )}
          </div>
        </div>

        {/* What-if simulator */}
        <div className="bg-gradient-to-r from-violet-50 to-fuchsia-50 rounded-xl border border-violet-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <SlidersHorizontal className="w-4 h-4 text-violet-600" />
            <h4 className="text-sm font-semibold text-violet-900">What-if Simulator</h4>
            <span className="text-xs text-violet-600 ml-auto">
              Et si vous augmentiez le volume d&apos;envoi ?
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <input
                type="range"
                min={-50}
                max={100}
                step={5}
                value={whatIfBoost}
                onChange={(e) => setWhatIfBoost(parseInt(e.target.value))}
                className="w-full accent-violet-600 cursor-pointer"
                aria-label="Ajustement volume"
              />
              <div className="flex justify-between text-[10px] text-violet-500 mt-1">
                <span>-50%</span>
                <span>0%</span>
                <span>+50%</span>
                <span>+100%</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-wide font-semibold text-violet-600">
                  Ajustement
                </div>
                <div className="text-2xl font-bold text-violet-900 tabular-nums">
                  {whatIfBoost > 0 ? "+" : ""}{whatIfBoost}%
                </div>
              </div>
              <div className="text-center px-4 border-l border-violet-200">
                <div className="text-[10px] uppercase tracking-wide font-semibold text-violet-600">
                  Conversions projetées
                </div>
                <div className="text-2xl font-bold text-violet-900 tabular-nums">
                  {boostedTotal}
                </div>
                <div className="text-[10px] text-violet-500">
                  {whatIfBoost === 0 ? "(baseline)" : `${boostedTotal - projectedTotal > 0 ? "+" : ""}${boostedTotal - projectedTotal} vs baseline`}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary stats */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Conversions historiques", value: data.summary.totalConversions, suffix: "" },
              { label: "Projection 30j", value: data.summary.projectedConversions, suffix: "" },
              { label: "Moyenne quotidienne", value: data.summary.avgDailyConversions, suffix: "" },
              { label: "Taux de réponse moyen", value: data.summary.avgReplyRate, suffix: "%" },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-xl border border-gray-100 p-3"
              >
                <div className="text-[11px] uppercase tracking-wide font-semibold text-gray-500">
                  {s.label}
                </div>
                <div className="text-xl font-bold text-gray-900 tabular-nums mt-1">
                  {s.value}{s.suffix}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
