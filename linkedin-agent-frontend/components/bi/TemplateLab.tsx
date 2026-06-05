"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer,
  LineChart, Line,
} from "recharts";
import { FlaskConical, BarChart4, Hash, Trophy, AlertOctagon, CalendarDays, Ruler, Download } from "lucide-react";
import { BIRange, downloadCSV } from "./biTypes";

interface Tpl { id: number; name: string; tag: string; usage: number; conversion: number; length: number; pattern?: string; }
interface Word { word: string; score: number; good: number; bad: number; }
interface HM { dow: number; hour: number; sent: number; replied: number; rate: number; }
interface LB { bucket: string; total: number; replied: number; rate: number; }

const DOW_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const BUSINESS_HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7h-20h

export default function TemplateLab({ range }: { range: BIRange }) {
  const [templates, setTemplates] = useState<Tpl[]>([]);
  const [words, setWords] = useState<Word[]>([]);
  const [heatmap, setHeatmap] = useState<HM[]>([]);
  const [lengthBuckets, setLengthBuckets] = useState<LB[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    queueMicrotask(() => setLoading(true));
    fetch(`/api/bi/templates?range=${range}`)
      .then(r => r.json())
      .then(j => {
        if (cancel || !j.success) return;
        setTemplates(j.templates || []);
        setWords(j.winningWords || []);
        setHeatmap(j.heatmap || []);
        setLengthBuckets(j.lengthBuckets || []);
      })
      .finally(() => !cancel && setLoading(false));
    return () => { cancel = true; };
  }, [range]);

  // Heatmap matrix
  const hmMap = new Map<string, HM>();
  heatmap.forEach(h => hmMap.set(`${h.dow}-${h.hour}`, h));
  const maxRate = Math.max(1, ...heatmap.map(h => h.rate));
  const bestSlot = heatmap.reduce<HM | null>((best, h) => {
    if (h.sent < 3) return best;
    return !best || h.rate > best.rate ? h : best;
  }, null);

  const top5 = [...templates].sort((a, b) => b.conversion - a.conversion).slice(0, 5);
  const flop5 = [...templates].filter(t => t.usage > 0).sort((a, b) => a.conversion - b.conversion).slice(0, 5);

  const maxWordScore = Math.max(1, ...words.map(w => w.score));

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-violet-50 via-fuchsia-50 to-pink-50 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Messages générés par l'agent IA</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                Patterns réellement générés à l'envoi • mots gagnants • timing optimal
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {bestSlot && (
              <Badge className="bg-violet-100 text-violet-700 border-0">
                Meilleur créneau: {DOW_LABELS[bestSlot.dow]} {bestSlot.hour}h
              </Badge>
            )}
            <button
              onClick={() => downloadCSV(`templates_${range}j.csv`, templates)}
              className="p-2 rounded-lg hover:bg-white/60 text-gray-500 hover:text-gray-700 transition"
              title="Export CSV"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Scatter usage × conversion */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <BarChart4 className="w-4 h-4 text-fuchsia-500" />
              Performance des patterns générés par l'agent
              <span className="text-xs font-normal text-gray-400 ml-2">
                (taille = nombre d&apos;envois)
              </span>
            </h4>
            <div style={{ height: 300 }} className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100 p-3">
              {templates.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      type="number"
                      dataKey="usage"
                      name="Utilisations"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      label={{ value: "Utilisations", position: "insideBottom", offset: -5, fill: "#64748b", fontSize: 11 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="conversion"
                      name="Conversion"
                      unit="%"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 11 }}
                    />
                    <ZAxis type="number" dataKey="usage" range={[60, 400]} />
                    <RTooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                      content={({ active, payload }: any) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as Tpl;
                        return (
                          <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3">
                            <div className="font-semibold text-sm">{d.name}</div>
                            <div className="text-xs text-gray-500 mb-1">{d.tag}</div>
                            <div className="text-xs">Utilisations: <b>{d.usage}</b></div>
                            <div className="text-xs">Conversion: <b>{d.conversion}%</b></div>
                            <div className="text-xs text-gray-500">{d.length} caractères</div>
                          </div>
                        );
                      }}
                    />
                    <Scatter data={templates} fill="#a855f7" fillOpacity={0.7} />
                  </ScatterChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-gray-400">
                  Aucun message généré sur la période
                </div>
              )}
            </div>
          </div>

          {/* Winning words */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Hash className="w-4 h-4 text-amber-500" />
              Mots gagnants
            </h4>
            <div className="bg-gradient-to-br from-amber-50/50 to-white rounded-xl border border-amber-100 p-3" style={{ height: 300, overflowY: "auto" }}>
              {words.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {words.map((w, i) => {
                    const intensity = w.score / maxWordScore;
                    const fontSize = 11 + Math.round(intensity * 7);
                    return (
                      <motion.span
                        key={w.word}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.04 }}
                        className="px-2 py-1 rounded-lg font-semibold"
                        style={{
                          fontSize: `${fontSize}px`,
                          backgroundColor: `rgba(168, 85, 247, ${0.12 + intensity * 0.5})`,
                          color: intensity > 0.6 ? "white" : "#6b21a8",
                        }}
                        title={`Score: +${w.score} (${w.good} gagnants / ${w.bad} perdants)`}
                      >
                        {w.word}
                      </motion.span>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-gray-400">
                  Pas assez de messages générés
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top / Flop templates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-emerald-50/50 rounded-xl border border-emerald-100 p-4">
            <h4 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-2">
              <Trophy className="w-4 h-4" /> Top 5 patterns générés
            </h4>
            <div className="space-y-1.5">
              {top5.length > 0 ? top5.map((t, i) => (
                <div key={t.id} className="flex items-center justify-between gap-2 text-sm bg-white rounded-lg px-3 py-2 border border-emerald-100">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-emerald-600 font-bold text-xs">#{i + 1}</span>
                    <span className="truncate font-medium text-gray-700">{t.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-400">{t.usage}×</span>
                    <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">{t.conversion}%</Badge>
                  </div>
                </div>
              )) : (
                <div className="text-xs text-gray-400 italic">Aucun pattern généré</div>
              )}
            </div>
          </div>

          <div className="bg-rose-50/50 rounded-xl border border-rose-100 p-4">
            <h4 className="text-sm font-semibold text-rose-700 mb-2 flex items-center gap-2">
              <AlertOctagon className="w-4 h-4" /> Flop 5 patterns (à améliorer)
            </h4>
            <div className="space-y-1.5">
              {flop5.length > 0 ? flop5.map((t, i) => (
                <div key={t.id} className="flex items-center justify-between gap-2 text-sm bg-white rounded-lg px-3 py-2 border border-rose-100">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-rose-600 font-bold text-xs">#{i + 1}</span>
                    <span className="truncate font-medium text-gray-700">{t.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-400">{t.usage}×</span>
                    <Badge className="bg-rose-100 text-rose-700 border-0 text-xs">{t.conversion}%</Badge>
                  </div>
                </div>
              )) : (
                <div className="text-xs text-gray-400 italic">Aucun pattern généré</div>
              )}
            </div>
          </div>
        </div>

        {/* Heatmap jour × heure */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-blue-500" />
            Heatmap des taux de réponse (jour × heure)
          </h4>
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100 p-3">
            <table className="text-xs w-full table-fixed">
              <thead>
                <tr>
                  <th className="p-1 w-10"></th>
                  {BUSINESS_HOURS.map(h => (
                    <th key={h} className="p-1 text-center text-gray-500 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5, 6, 0].map(dow => (
                  <tr key={dow}>
                    <td className="p-1 text-gray-700 font-semibold pr-2 w-10">{DOW_LABELS[dow]}</td>
                    {BUSINESS_HOURS.map(h => {
                      const cell = hmMap.get(`${dow}-${h}`);
                      const rate = cell?.rate || 0;
                      const sent = cell?.sent || 0;
                      const intensity = maxRate > 0 ? rate / maxRate : 0;
                      return (
                        <td key={h} className="p-1">
                          <div
                            className="w-full h-9 rounded-md flex items-center justify-center font-semibold transition-all hover:scale-110 hover:shadow-md cursor-default"
                            style={{
                              backgroundColor: sent === 0
                                ? "#f1f5f9"
                                : `rgba(16, 185, 129, ${0.1 + intensity * 0.7})`,
                              color: intensity > 0.5 ? "white" : "#065f46",
                              fontSize: "11px",
                            }}
                            title={`${DOW_LABELS[dow]} ${h}h • ${sent} envoyés • ${rate}% réponses`}
                          >
                            {sent > 0 ? rate : ""}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center gap-2 mt-3 text-[10px] text-gray-500">
              <span>Faible</span>
              <div className="flex gap-0.5">
                {[0.1, 0.25, 0.45, 0.65, 0.85].map(o => (
                  <div key={o} className="w-6 h-4 rounded" style={{ backgroundColor: `rgba(16, 185, 129, ${o})` }} />
                ))}
              </div>
              <span>Élevé</span>
              <span className="ml-2">• % = taux de réponse</span>
            </div>
          </div>
        </div>

        {/* Length vs reply rate */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <Ruler className="w-4 h-4 text-indigo-500" />
            Longueur du message vs taux de réponse
          </h4>
          <div style={{ height: 220 }} className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100 p-3">
            {lengthBuckets.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lengthBuckets} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="bucket" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} unit="%" />
                  <RTooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                    formatter={(v: any, n: any) => [n === "rate" ? `${v}%` : v, n === "rate" ? "Taux de réponse" : "Volume"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="#6366f1"
                    strokeWidth={3}
                    dot={{ r: 5, fill: "#6366f1" }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-gray-400">
                Pas assez de messages
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
