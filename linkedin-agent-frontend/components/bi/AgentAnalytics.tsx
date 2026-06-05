"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  ResponsiveContainer, Tooltip as RTooltip,
  RadialBarChart, RadialBar, PolarAngleAxis,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import { Bot, Cpu, ShieldCheck, BarChart2, Download } from "lucide-react";
import { BIRange, fmt, downloadCSV } from "./biTypes";

interface ToolStat { tool: string; total: number; success: number; errors: number; successRate: number; }
interface ApprovalRow { action_type: string; total: number; completed: number; pending: number; failed: number; }
interface TLPoint { day: string; agentActions: number; messages: number; executed: number; }
interface AgentSummary {
  totalActions: number; totalErrors: number; successRate: number;
  conversations: number; chatMessages: number;
  hoursSaved: number; moneySaved: number;
}

const PIE_COLORS = ["#a855f7", "#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#84cc16"];

export default function AgentAnalytics({ range }: { range: BIRange }) {
  const [tools, setTools] = useState<ToolStat[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRow[]>([]);
  const [timeline, setTimeline] = useState<TLPoint[]>([]);
  const [summary, setSummary] = useState<AgentSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    queueMicrotask(() => setLoading(true));
    fetch(`/api/bi/agent?range=${range}`)
      .then(r => r.json())
      .then(j => {
        if (cancel || !j.success) return;
        setTools(j.tools || []);
        setApprovals(j.approvalSummary || []);
        setTimeline(j.timeline || []);
        setSummary(j.summary || null);
      })
      .finally(() => !cancel && setLoading(false));
    return () => { cancel = true; };
  }, [range]);

  const pieData = tools.map(t => ({ name: t.tool, value: t.total }));

  const radialData = summary ? [
    {
      name: "Taux de succès",
      value: summary.successRate,
      fill: "#10b981",
    },
  ] : [];

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
              <Bot className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-lg">AI Agent Analytics</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                Tool usage • taux de succès • ROI mesuré
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {summary && (
              <Badge className="bg-purple-100 text-purple-700 border-0">
                {fmt(summary.totalActions)} actions • {summary.successRate}% succès
              </Badge>
            )}
            <button
              onClick={() => downloadCSV(`agent_tools_${range}j.csv`, tools)}
              className="p-2 rounded-lg hover:bg-white/60 text-gray-500 hover:text-gray-700 transition"
              title="Export CSV"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Top: KPI cards + Success rate dial + tool pie */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {summary && [
            { label: "Actions agent", value: fmt(summary.totalActions), icon: BarChart2, color: "text-purple-600", bg: "bg-purple-50" },
            { label: "Conversations", value: summary.conversations, icon: Bot, color: "text-indigo-600", bg: "bg-indigo-50" },
            { label: "Heures éco.", value: `${summary.hoursSaved}h`, icon: Cpu, color: "text-cyan-600", bg: "bg-cyan-50" },
            { label: "Valeur ROI", value: `${fmt(summary.moneySaved)}€`, icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
          ].map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.div
                key={c.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3"
              >
                <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${c.color}`} />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide font-semibold text-gray-500">{c.label}</div>
                  <div className="text-xl font-bold text-gray-900 tabular-nums">{c.value}</div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Tool usage pie */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Outils utilisés par l&apos;agent</h4>
            <div style={{ height: 280 }} className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100 p-3">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RTooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-gray-400">
                  Aucune action agent
                </div>
              )}
            </div>
          </div>

          {/* Success radial */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Taux de succès global</h4>
            <div style={{ height: 280 }} className="bg-gradient-to-br from-emerald-50/50 to-white rounded-xl border border-emerald-100 p-3 flex flex-col items-center justify-center">
              {summary ? (
                <ResponsiveContainer width="100%" height="80%">
                  <RadialBarChart
                    cx="50%"
                    cy="50%"
                    innerRadius="65%"
                    outerRadius="100%"
                    data={radialData}
                    startAngle={90}
                    endAngle={-270}
                  >
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                    <RadialBar background={{ fill: "#e2e8f0" }} dataKey="value" cornerRadius={10} />
                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-emerald-700" fontSize="32" fontWeight="bold">
                      {summary.successRate}%
                    </text>
                  </RadialBarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-sm text-gray-400">Pas de données</div>
              )}
              {summary && (
                <div className="text-xs text-gray-500 mt-1">
                  {summary.totalActions - summary.totalErrors} succès / {summary.totalErrors} erreurs
                </div>
              )}
            </div>
          </div>

          {/* Tool detail list */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Détail par outil</h4>
            <div style={{ height: 280 }} className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100 p-3 overflow-y-auto">
              {tools.length > 0 ? (
                <div className="space-y-2">
                  {tools.map((t, i) => (
                    <motion.div
                      key={t.tool}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="bg-white rounded-lg border border-gray-100 p-2"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono font-semibold text-gray-700 truncate">{t.tool}</span>
                        <span className="text-xs font-bold tabular-nums">{t.total}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-emerald-400"
                          style={{ width: `${t.successRate}%` }}
                        />
                        <div
                          className="h-full bg-rose-400"
                          style={{ width: `${100 - t.successRate}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
                        <span className="text-emerald-600">{t.success} ✓</span>
                        <span className="text-rose-600">{t.errors} ✗</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-gray-400">
                  Aucune donnée
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Activity timeline */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Activité agent dans le temps</h4>
          <div style={{ height: 220 }} className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100 p-3">
            {timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="agentArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="msgArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
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
                  <Area type="monotone" dataKey="agentActions" stroke="#a855f7" strokeWidth={2} fill="url(#agentArea)" name="Actions agent" />
                  <Area type="monotone" dataKey="messages" stroke="#10b981" strokeWidth={2} fill="url(#msgArea)" name="Messages" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-gray-400">
                Pas d&apos;activité
              </div>
            )}
          </div>
        </div>

        {/* Approvals */}
        {approvals.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Approbations LinkedIn (auto vs manuel)</h4>
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100 p-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {approvals.map(a => {
                  const autoRate = a.total > 0 ? Math.round((a.completed / a.total) * 100) : 0;
                  return (
                    <div key={a.action_type} className="bg-white rounded-lg border border-gray-100 p-3">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-sm font-mono font-semibold text-gray-700">{a.action_type}</span>
                        <Badge className="bg-purple-100 text-purple-700 border-0 text-xs">
                          {a.total} actions
                        </Badge>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                        <div className="h-full bg-emerald-400" style={{ width: `${autoRate}%` }} title={`${a.completed} complétées`} />
                        <div className="h-full bg-amber-400" style={{ width: `${a.total > 0 ? (a.pending / a.total) * 100 : 0}%` }} title={`${a.pending} en attente`} />
                        <div className="h-full bg-rose-400" style={{ width: `${a.total > 0 ? (a.failed / a.total) * 100 : 0}%` }} title={`${a.failed} échecs`} />
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                        <span>✓ {a.completed} complétées</span>
                        <span>⏱ {a.pending} attente</span>
                        <span>✗ {a.failed} échecs</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
