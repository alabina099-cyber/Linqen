"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  Treemap, ResponsiveContainer, Tooltip as RTooltip,
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid,
  BarChart, Bar, Cell,
} from "recharts";
import { MapPin, Globe, Target, BarChartHorizontal, LayoutGrid, Download } from "lucide-react";
import { BIRange, downloadCSV } from "./biTypes";

interface GeoRow { location: string; total: number; converted: number; avgScore: number; conversionRate: number; }
interface IndRow { name: string; size: number; avgScore: number; converted: number; [key: string]: any; }
interface ScoreBucket { bucket: string; count: number; converted: number; }
interface ICPRow { id: number; name: string; company: string; score: number; engagement: number; status: string; }

const TM_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#84cc16", "#6366f1", "#f97316", "#14b8a6", "#a855f7"];

const STATUS_COLORS: Record<string, string> = {
  identified: "#94a3b8",
  connected: "#60a5fa",
  contacted: "#3b82f6",
  responded: "#8b5cf6",
  interested: "#a855f7",
  converted: "#10b981",
};

function TreemapContent(props: any) {
  const { x, y, width, height, name, size, index, root } = props;
  const total = root?.children?.reduce((s: number, c: any) => s + c.size, 0) || 1;
  const pct = Math.round((size / total) * 100);
  const color = TM_COLORS[index % TM_COLORS.length];
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={color} stroke="#fff" strokeWidth={2} rx={6} />
      {width > 60 && height > 30 && (
        <>
          <text x={x + 8} y={y + 18} fill="white" fontSize={12} fontWeight={600}>
            {name}
          </text>
          <text x={x + 8} y={y + 34} fill="white" fontSize={11} opacity={0.9}>
            {size} • {pct}%
          </text>
        </>
      )}
    </g>
  );
}

export default function ProspectMap({ range }: { range: BIRange }) {
  const [geo, setGeo] = useState<GeoRow[]>([]);
  const [industries, setIndustries] = useState<IndRow[]>([]);
  const [scoreDist, setScoreDist] = useState<ScoreBucket[]>([]);
  const [icp, setIcp] = useState<ICPRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    queueMicrotask(() => setLoading(true));
    fetch(`/api/bi/geo?range=${range}`)
      .then(r => r.json())
      .then(j => {
        if (cancel || !j.success) return;
        setGeo(j.geo || []);
        setIndustries(j.industries || []);
        setScoreDist(j.scoreDistribution || []);
        setIcp(j.icpQuadrant || []);
      })
      .finally(() => !cancel && setLoading(false));
    return () => { cancel = true; };
  }, [range]);

  const maxGeo = Math.max(1, ...geo.map(g => g.total));
  const totalProspects = geo.reduce((s, g) => s + g.total, 0);

  // ICP quadrant: define median score & engagement
  const medianScore = 50;
  const medianEng = icp.length > 0
    ? [...icp].sort((a, b) => a.engagement - b.engagement)[Math.floor(icp.length / 2)].engagement
    : 0;

  const quadrantCounts = {
    champions: icp.filter(p => p.score >= medianScore && p.engagement >= medianEng).length,
    hot: icp.filter(p => p.score >= medianScore && p.engagement < medianEng).length,
    warm: icp.filter(p => p.score < medianScore && p.engagement >= medianEng).length,
    cold: icp.filter(p => p.score < medianScore && p.engagement < medianEng).length,
  };

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
              <Globe className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Prospect Intelligence Map</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                Geography • industries • ICP score • champion/cold quadrant
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-100 text-emerald-700 border-0">
              {totalProspects} prospects analyzed
            </Badge>
            <button
              onClick={() => downloadCSV(`prospects_geo_${range}j.csv`, geo)}
              className="p-2 rounded-lg hover:bg-white/60 text-gray-500 hover:text-gray-700 transition"
              title="Export CSV"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Top row: Geo bubbles + Industry treemap */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Geo */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-500" />
              Top locations (density × conversion)
            </h4>
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100 p-4 space-y-2 max-h-[320px] overflow-y-auto">
              {geo.length > 0 ? geo.slice(0, 12).map((g, i) => {
                const widthPct = (g.total / maxGeo) * 100;
                return (
                  <motion.div
                    key={g.location}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="group"
                  >
                    <div className="flex items-center justify-between mb-0.5 text-xs">
                      <span className="font-semibold text-gray-700 truncate flex-1">{g.location}</span>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-gray-400">score {g.avgScore}</span>
                        <Badge className={`border-0 text-[10px] ${
                          g.conversionRate >= 10 ? "bg-emerald-100 text-emerald-700"
                          : g.conversionRate >= 5 ? "bg-amber-100 text-amber-700"
                          : "bg-gray-100 text-gray-600"
                        }`}>
                          {g.conversionRate}% conv
                        </Badge>
                        <span className="font-bold text-gray-900 tabular-nums w-8 text-right">{g.total}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${widthPct}%` }}
                        transition={{ duration: 0.5, delay: i * 0.04 }}
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
                      />
                    </div>
                  </motion.div>
                );
              }) : (
                <div className="text-center text-sm text-gray-400 py-8">No geographic data</div>
              )}
            </div>
          </div>

          {/* Industry treemap */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-blue-500" />
              Distribution by industry
            </h4>
            <div style={{ height: 320 }} className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100 p-2">
              {industries.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <Treemap
                    data={industries}
                    dataKey="size"
                    nameKey="name"
                    aspectRatio={4 / 3}
                    stroke="#fff"
                    content={<TreemapContent />}
                  >
                    <RTooltip
                      contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                      content={({ active, payload }: any) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
                            <div className="font-semibold text-sm mb-1">{d.name}</div>
                            <div>Prospects: <b>{d.size}</b></div>
                            <div>Avg score: <b>{d.avgScore}/100</b></div>
                            <div>Converted: <b>{d.converted}</b></div>
                          </div>
                        );
                      }}
                    />
                  </Treemap>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-gray-400">
                  No industry data
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Score distribution + ICP quadrant */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Score histogram */}
          <div className="xl:col-span-2">
            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <BarChartHorizontal className="w-4 h-4 text-indigo-500" />
              ICP score distribution
            </h4>
            <div style={{ height: 280 }} className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100 p-3">
              {scoreDist.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scoreDist} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="bucket" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                    <RTooltip
                      contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                    />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      {scoreDist.map((d, i) => {
                        const colors = ["#fca5a5", "#fbbf24", "#a3e635", "#34d399", "#10b981"];
                        return <Cell key={i} fill={colors[i] || "#6366f1"} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-gray-400">
                  No scores
                </div>
              )}
            </div>
          </div>

          {/* ICP quadrant scatter */}
          <div className="xl:col-span-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Target className="w-4 h-4 text-rose-500" />
                ICP fit quadrant (score × engagement)
              </h4>
              <div className="flex gap-1.5">
                <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px]">
                  Champions: {quadrantCounts.champions}
                </Badge>
                <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">
                  Hot: {quadrantCounts.hot}
                </Badge>
                <Badge className="bg-blue-100 text-blue-700 border-0 text-[10px]">
                  Warm: {quadrantCounts.warm}
                </Badge>
                <Badge className="bg-gray-100 text-gray-700 border-0 text-[10px]">
                  Cold: {quadrantCounts.cold}
                </Badge>
              </div>
            </div>
            <div style={{ height: 280 }} className="relative bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100 p-3">
              {/* Quadrant labels overlay */}
              <div className="absolute inset-3 grid grid-cols-2 grid-rows-2 pointer-events-none z-10 opacity-30">
                <div className="border-r border-b border-dashed border-gray-300 flex items-start justify-end p-2">
                  <span className="text-[10px] font-bold text-blue-600">WARM</span>
                </div>
                <div className="border-b border-dashed border-gray-300 flex items-start justify-start p-2">
                  <span className="text-[10px] font-bold text-emerald-600">CHAMPIONS</span>
                </div>
                <div className="border-r border-dashed border-gray-300 flex items-end justify-end p-2">
                  <span className="text-[10px] font-bold text-gray-500">COLD</span>
                </div>
                <div className="flex items-end justify-start p-2">
                  <span className="text-[10px] font-bold text-amber-600">HOT</span>
                </div>
              </div>
              {icp.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      type="number"
                      dataKey="engagement"
                      name="Engagement"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      label={{ value: "Engagement (messages)", position: "insideBottom", offset: -5, fill: "#64748b", fontSize: 11 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="score"
                      name="Score ICP"
                      domain={[0, 100]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 11 }}
                    />
                    <ZAxis range={[40, 200]} />
                    <RTooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                      content={({ active, payload }: any) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as ICPRow;
                        return (
                          <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
                            <div className="font-semibold text-sm">{d.name}</div>
                            <div className="text-gray-500 mb-1">{d.company}</div>
                            <div>Score: <b>{d.score}/100</b></div>
                            <div>Engagement: <b>{d.engagement}</b></div>
                            <div>Status: <b>{d.status}</b></div>
                          </div>
                        );
                      }}
                    />
                    <Scatter data={icp}>
                      {icp.map((p, i) => (
                        <Cell key={i} fill={STATUS_COLORS[p.status] || "#94a3b8"} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-gray-400">
                  No prospect
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
