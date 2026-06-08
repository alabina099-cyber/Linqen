"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  Sankey, Tooltip as RTooltip, ResponsiveContainer, Layer, Rectangle,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell,
} from "recharts";
import { Filter, ListChecks, Timer, GitBranch, Table, Download } from "lucide-react";
import { BIRange, downloadCSV } from "./biTypes";

interface FunnelStep {
  stage: string;
  key: string;
  value: number;
  color: string;
  conversionFromPrev: number;
  dropOff: number;
}
interface CycleStep { status: string; avgDays: number; count: number; }
interface CohortRow {
  week: string;
  total: number;
  identified: number;
  connected: number;
  contacted: number;
  responded: number;
  interested: number;
  converted: number;
}
interface SankeyData {
  nodes: { name: string }[];
  links: { source: number; target: number; value: number }[];
}

const NODE_COLORS = ["#94a3b8", "#60a5fa", "#3b82f6", "#8b5cf6", "#a855f7", "#10b981"];

function SankeyNode({ x, y, width, height, index, payload }: any) {
  const color = NODE_COLORS[index % NODE_COLORS.length];
  const isLeft = index === 0;
  const labelOffset = isLeft ? 12 : 8;
  return (
    <Layer>
      <Rectangle x={x} y={y} width={width} height={height} fill={color} fillOpacity={0.95} rx={2} />
      <text
        textAnchor={isLeft ? "start" : "end"}
        x={isLeft ? x + width + labelOffset : x - labelOffset}
        y={y + height / 2 + 3}
        fontSize="9"
        fontWeight="600"
        fill="currentColor"
        className="text-slate-700 dark:text-gray-100"
      >
        {payload.name}
      </text>
      <text
        textAnchor={isLeft ? "start" : "end"}
        x={isLeft ? x + width + labelOffset : x - labelOffset}
        y={y + height / 2 + 15}
        fontSize="8"
        fill="currentColor"
        className="text-slate-500 dark:text-gray-300"
      >
        {payload.value}
      </text>
    </Layer>
  );
}

export default function ConversionIntelligence({ data: apiData, loading, range }: { data: any; loading: boolean; range: BIRange }) {
  const funnel = useMemo<FunnelStep[]>(() => apiData?.funnel ?? [], [apiData]);
  const cycle = useMemo<CycleStep[]>(() => apiData?.cycleTime ?? [], [apiData]);
  const cohorts = useMemo<CohortRow[]>(() => apiData?.cohorts ?? [], [apiData]);
  const sankey = useMemo<SankeyData>(() => apiData?.sankey ?? { nodes: [], links: [] }, [apiData]);

  const totalDropOff = funnel.reduce((s, f) => s + f.dropOff, 0);
  const overallConversion = funnel.length > 1 && funnel[0].value > 0
    ? Math.round((funnel[funnel.length - 1].value / funnel[0].value) * 1000) / 10
    : 0;

  const maxCohort = Math.max(1, ...cohorts.map(c => c.total));

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-50 via-indigo-50 to-violet-50 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
              <Filter className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Conversion Intelligence</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
Analyzing the Prospect-to-Customer Journey              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-100 text-blue-700 border-0">
              {overallConversion}% global conversion
            </Badge>
            <button
              onClick={() => downloadCSV(`funnel_${range}j.csv`, funnel)}
              className="p-2 rounded-lg hover:bg-white/60 text-gray-500 hover:text-gray-700 transition"
              title="Export CSV"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Sankey + Funnel side by side */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Sankey */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-blue-500" />
                Conversion flow (Sankey)
              </h4>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100 p-3" style={{ height: 360 }}>
              {sankey.links.length > 0 && !loading ? (
                <ResponsiveContainer width="100%" height="100%">
                  <Sankey
                    data={sankey}
                    nodePadding={35}
                    nodeWidth={5}
                    linkCurvature={0.6}
                    iterations={64}
                    margin={{ top: 10, right: 40, bottom: 10, left: 70 }}
                    node={<SankeyNode />}
                    link={{ stroke: "#3b82f6", strokeOpacity: 0.18 }}
                  >
                    <RTooltip />
                  </Sankey>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-gray-400">
                  {loading ? "Loading..." : "Not enough data for the selected period"}
                </div>
              )}
            </div>
          </div>

          {/* Funnel détaillé avec drop-off */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-indigo-500" />
                Funnel steps & drop-off
              </h4>
              <span className="text-xs text-rose-600 font-semibold">
                Total losses: {totalDropOff}
              </span>
            </div>
            <div className="space-y-2">
              {funnel.map((step, i) => {
                const widthPct = funnel[0].value > 0
                  ? Math.max(8, (step.value / funnel[0].value) * 100)
                  : 0;
                return (
                  <motion.div
                    key={step.key}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: step.color }} />
                        <span className="text-sm font-semibold text-gray-700">{step.stage}</span>
                        {i > 0 && (
                          <Badge className={`text-[10px] border-0 ${
                            step.conversionFromPrev >= 50
                              ? "bg-emerald-50 text-emerald-700"
                              : step.conversionFromPrev >= 25
                              ? "bg-amber-50 text-amber-700"
                              : "bg-rose-50 text-rose-700"
                          }`}>
                            {step.conversionFromPrev}% vs previous step
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm font-bold text-gray-900 tabular-nums">{step.value}</span>
                    </div>
                    <div className="relative h-7 bg-gray-50 rounded-lg overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${widthPct}%` }}
                        transition={{ duration: 0.6, delay: i * 0.06, ease: "easeOut" }}
                        className="h-full rounded-lg"
                        style={{
                          background: `linear-gradient(90deg, ${step.color}, ${step.color}cc)`,
                        }}
                      />
                      {i > 0 && step.dropOff > 0 && (
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                          −{step.dropOff} lost
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Cycle time + Cohort heatmap */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Cycle time */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Timer className="w-4 h-4 text-amber-500" />
              Average cycle time by step
            </h4>
            <div style={{ height: 240 }} className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100 p-3">
              {cycle.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cycle} margin={{ top: 10, right: 20, left: 0, bottom: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} unit="d" />
                    <YAxis dataKey="status" type="category" width={90} axisLine={false} tickLine={false} tick={{ fill: "#475569", fontSize: 11, fontWeight: 500 }} />
                    <RTooltip
                      contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                      formatter={(v: any) => [`${v} days`, "Average duration"]}
                    />
                    <Bar dataKey="avgDays" radius={[0, 8, 8, 0]} barSize={20}>
                      {cycle.map((_, i) => (
                        <Cell key={i} fill={NODE_COLORS[i % NODE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-gray-400">
                  No cycle data available
                </div>
              )}
            </div>
          </div>

          {/* Cohort heatmap */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Table className="w-4 h-4 text-violet-500" />
              Weekly cohorts
            </h4>
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100 p-3 overflow-x-auto" style={{ minHeight: 240 }}>
              {cohorts.length > 0 ? (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500">
                      <th className="text-left p-1.5 font-semibold">Week</th>
                      <th className="p-1.5 font-semibold">Total</th>
                      <th className="p-1.5 font-semibold">Connected</th>
                      <th className="p-1.5 font-semibold">Contacted</th>
                      <th className="p-1.5 font-semibold">Replied</th>
                      <th className="p-1.5 font-semibold">Converted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cohorts.map((c, i) => {
                      const cell = (val: number) => {
                        const intensity = Math.min(1, val / maxCohort);
                        const bg = `rgba(59, 130, 246, ${0.08 + intensity * 0.55})`;
                        return (
                          <td className="p-1 text-center">
                            <div
                              className="rounded-md py-1.5 font-semibold tabular-nums"
                              style={{ backgroundColor: bg, color: intensity > 0.5 ? "white" : "#1e3a8a" }}
                            >
                              {val}
                            </div>
                          </td>
                        );
                      };
                      return (
                        <tr key={i}>
                          <td className="p-1.5 text-gray-700 font-medium whitespace-nowrap">
                            {new Date(c.week).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                          </td>
                          {cell(c.total)}
                          {cell(c.connected)}
                          {cell(c.contacted)}
                          {cell(c.responded)}
                          {cell(c.converted)}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-gray-400">
                  No cohorts for the period
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
