"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { BrainCircuit, ThumbsUp, ThumbsDown, Lightbulb, Info } from "lucide-react";
import { BIRange, fmt } from "./biTypes";

interface Insight {
  type: "win" | "loss" | "tip" | "info";
  title: string;
  detail: string;
  metric?: string;
}

// Génère des insights narratifs à partir de plusieurs endpoints BI
export default function AIInsights({ range }: { range: BIRange }) {
  const [kpi, setKpi] = useState<any>(null);
  const [conv, setConv] = useState<any>(null);
  const [tpl, setTpl] = useState<any>(null);
  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    Promise.all([
      fetch(`/api/bi/kpi?range=${range}`).then(r => r.json()).catch(() => null),
      fetch(`/api/bi/conversion?range=${range}`).then(r => r.json()).catch(() => null),
      fetch(`/api/bi/templates?range=${range}`).then(r => r.json()).catch(() => null),
      fetch(`/api/bi/agent?range=${range}`).then(r => r.json()).catch(() => null),
    ]).then(([k, c, t, a]) => {
      if (cancel) return;
      if (k?.success) setKpi(k.kpis);
      if (c?.success) setConv(c);
      if (t?.success) setTpl(t);
      if (a?.success) setAgent(a);
    }).finally(() => !cancel && setLoading(false));
    return () => { cancel = true; };
  }, [range]);

  const insights = useMemo<Insight[]>(() => {
    const out: Insight[] = [];
    if (!kpi) return out;

    // Reply rate insight
    if (kpi.replyRate.value >= 15) {
      out.push({
        type: "win",
        title: "Excellent taux de réponse",
        detail: `Votre taux de ${kpi.replyRate.value}% est au-dessus de la moyenne LinkedIn (5-10%). Continuez sur cette lancée.`,
        metric: `${kpi.replyRate.value}%`,
      });
    } else if (kpi.replyRate.value < 5 && kpi.messages.value > 10) {
      out.push({
        type: "loss",
        title: "Taux de réponse faible",
        detail: `À ${kpi.replyRate.value}% seulement. Recommandation: testez de nouveaux templates et personnalisez davantage.`,
        metric: `${kpi.replyRate.value}%`,
      });
    }

    // Growth trends
    if (kpi.prospects.delta > 20) {
      out.push({
        type: "win",
        title: "Croissance prospects forte",
        detail: `+${kpi.prospects.delta}% de nouveaux prospects vs période précédente. La machine à leads tourne bien.`,
        metric: `+${kpi.prospects.delta}%`,
      });
    } else if (kpi.prospects.delta < -10) {
      out.push({
        type: "loss",
        title: "Acquisition en baisse",
        detail: `${kpi.prospects.delta}% de prospects vs période précédente. Pensez à élargir vos critères de recherche.`,
        metric: `${kpi.prospects.delta}%`,
      });
    }

    // Conversion funnel weak point
    if (conv?.funnel?.length) {
      let worst: any = null;
      for (let i = 1; i < conv.funnel.length; i++) {
        const f = conv.funnel[i];
        if (f.conversionFromPrev > 0 && (!worst || f.conversionFromPrev < worst.conversionFromPrev)) {
          worst = f;
        }
      }
      if (worst && worst.conversionFromPrev < 30) {
        out.push({
          type: "tip",
          title: "Goulot d'étranglement détecté",
          detail: `L'étape "${worst.stage}" ne convertit qu'à ${worst.conversionFromPrev}%. C'est là que vous perdez le plus de prospects.`,
          metric: `${worst.conversionFromPrev}%`,
        });
      }
    }

    // Best heatmap slot
    if (tpl?.heatmap?.length) {
      const DOW = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
      const best = tpl.heatmap.reduce((b: any, h: any) => {
        if (h.sent < 3) return b;
        return !b || h.rate > b.rate ? h : b;
      }, null);
      if (best && best.rate > 0) {
        out.push({
          type: "tip",
          title: "Créneau optimal identifié",
          detail: `Vos messages envoyés ${DOW[best.dow]} à ${best.hour}h obtiennent ${best.rate}% de réponses. Concentrez vos envois sur ce créneau.`,
          metric: `${DOW[best.dow]} ${best.hour}h`,
        });
      }
    }

    // Best winning word
    if (tpl?.winningWords?.length > 0) {
      const top = tpl.winningWords[0];
      if (top.score >= 2) {
        out.push({
          type: "tip",
          title: "Mot gagnant détecté",
          detail: `Le mot "${top.word}" apparaît ${top.good}× dans vos meilleurs templates. Réutilisez-le.`,
          metric: top.word,
        });
      }
    }

    // Agent error rate
    if (agent?.summary && agent.summary.totalActions > 20 && agent.summary.successRate < 80) {
      out.push({
        type: "loss",
        title: "Taux d'échec agent élevé",
        detail: `Seulement ${agent.summary.successRate}% des actions réussissent. Vérifiez la connexion à l'extension Chrome et les sélecteurs LinkedIn.`,
        metric: `${100 - agent.summary.successRate}% d'échecs`,
      });
    }

    return out.slice(0, 6);
  }, [kpi, conv, tpl, agent, range]);

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-violet-50 via-fuchsia-50 to-pink-50 rounded-2xl border border-violet-100 p-5">
        <div className="flex items-center gap-2 mb-3">
          <BrainCircuit className="w-5 h-5 text-violet-600 animate-pulse" />
          <h3 className="font-semibold text-violet-900">L&apos;IA analyse vos données...</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-white/60 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (insights.length === 0) {
    return null;
  }

  const styles: Record<Insight["type"], { icon: any; bg: string; iconColor: string; border: string; titleColor: string }> = {
    win:  { icon: ThumbsUp,   bg: "bg-emerald-50", iconColor: "text-emerald-600", border: "border-emerald-100", titleColor: "text-emerald-900" },
    loss: { icon: ThumbsDown, bg: "bg-rose-50",    iconColor: "text-rose-600",    border: "border-rose-100",    titleColor: "text-rose-900" },
    tip:  { icon: Lightbulb,  bg: "bg-amber-50",   iconColor: "text-amber-600",   border: "border-amber-100",   titleColor: "text-amber-900" },
    info: { icon: Info,       bg: "bg-blue-50",    iconColor: "text-blue-600",    border: "border-blue-100",    titleColor: "text-blue-900" },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/60 via-white to-fuchsia-50/40 p-5"
    >
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-gradient-to-br from-violet-300 to-fuchsia-300 opacity-20 rounded-full blur-3xl" />

      <div className="relative flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-lg flex items-center justify-center shadow-md">
          <BrainCircuit className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900">AI Insights</h3>
          <p className="text-xs text-gray-500">Narration générée à partir de vos données</p>
        </div>
        <span className="ml-auto text-[10px] uppercase tracking-widest font-semibold text-violet-600 bg-violet-100 px-2 py-1 rounded-full">
          {insights.length} insights
        </span>
      </div>

      <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {insights.map((ins, i) => {
          const s = styles[ins.type];
          const Icon = s.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`${s.bg} ${s.border} border rounded-xl p-3 hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start gap-2">
                <div className={`shrink-0 w-7 h-7 bg-white rounded-lg flex items-center justify-center ${s.iconColor}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className={`font-semibold text-sm ${s.titleColor}`}>{ins.title}</h4>
                    {ins.metric && (
                      <span className={`shrink-0 text-[10px] font-bold ${s.iconColor} bg-white px-1.5 py-0.5 rounded`}>
                        {ins.metric}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed">{ins.detail}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
