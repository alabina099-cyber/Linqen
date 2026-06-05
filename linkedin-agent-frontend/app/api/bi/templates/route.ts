import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

// GET /api/bi/templates?range=30
// Module 2: AI Message Pattern Performance Lab
//  Analyse les messages RÉELLEMENT générés par l'agent IA (table messages),
//  regroupés par PATTERN normalisé ({name}/{company}/{role} masqués).
//  - Scatter usage × conversion par pattern généré
//  - Top / Flop patterns générés par l'agent
//  - N-grams gagnants (mots-clés des patterns haut conversion)
//  - Heatmap jour × heure d'envoi (taux de réponse)
//  - Longueur message vs taux de réponse

// Normalise un message en masquant les variables personnalisées
// pour regrouper les messages structurellement identiques générés par l'agent.
function normalizePattern(
  text: string,
  name?: string | null,
  company?: string | null,
  role?: string | null
): string {
  let p = text || "";
  const mask = (val: string | null | undefined, token: string) => {
    if (!val) return;
    const trimmed = val.trim();
    if (trimmed.length < 2) return;
    // Masquer le nom complet ET chaque mot (prénom/nom) séparément
    const parts = [trimmed, ...trimmed.split(/\s+/)].filter(w => w.length >= 2);
    for (const part of parts) {
      const esc = part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      p = p.replace(new RegExp(esc, "gi"), token);
    }
  };
  mask(name, "{name}");
  mask(company, "{company}");
  mask(role, "{role}");
  // Collapse espaces / retours à la ligne pour un regroupement robuste
  return p.replace(/\s+/g, " ").trim();
}

// Génère un nom lisible pour un pattern à partir de son début
function patternName(normalized: string, index: number): string {
  const preview = normalized.replace(/\{(name|company|role)\}/g, "…").slice(0, 40).trim();
  return preview ? `Pattern: "${preview}…"` : `Pattern #${index + 1}`;
}
const STOPWORDS = new Set([
  "le","la","les","de","des","du","un","une","et","à","a","au","aux","ce","cet","cette","ces","en","par","pour","sur","dans","avec","sans","plus","mais","ou","où","si","que","qui","quoi","mon","ton","son","ma","ta","sa","mes","tes","ses","notre","votre","leur","nous","vous","ils","elles","je","tu","il","elle","on","est","sont","être","avoir","fait","faire","bien","bonjour","salut","the","a","an","of","and","or","to","in","on","at","for","with","is","are","be","you","i","we","they","he","she","it","this","that","my","your","our","their","hello","hi","dear",
]);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-zàâçéèêëîïôûùüÿñæœ\s]/gi, " ")
    .split(/\s+/)
    .filter(w => w.length >= 4 && !STOPWORDS.has(w));
}

export async function GET(req: NextRequest) {
  try {
    const range = parseInt(req.nextUrl.searchParams.get("range") || "30");

    // Messages réellement générés par l'agent IA (avec infos de personnalisation pour normaliser)
    const msgSql = `
      SELECT
        message_text,
        recipient_name,
        recipient_company,
        recipient_role,
        message_type,
        status
      FROM messages
      WHERE created_at > NOW() - INTERVAL '${range} days'
        AND message_text IS NOT NULL
    `;

    // Heatmap jour × heure (basé sur messages.created_at, marquage replied)
    const heatmapSql = `
      SELECT
        EXTRACT(DOW FROM created_at)::int AS dow,
        EXTRACT(HOUR FROM created_at)::int AS hour,
        COUNT(*) AS sent,
        COUNT(*) FILTER (WHERE status = 'replied') AS replied
      FROM messages
      WHERE created_at > NOW() - INTERVAL '${range} days'
      GROUP BY dow, hour
      ORDER BY dow, hour
    `;

    // Longueur message vs taux de réponse (par buckets)
    const lengthSql = `
      WITH bucketed AS (
        SELECT
          CASE
            WHEN LENGTH(message_text) < 100 THEN '0-100'
            WHEN LENGTH(message_text) < 200 THEN '100-200'
            WHEN LENGTH(message_text) < 300 THEN '200-300'
            WHEN LENGTH(message_text) < 500 THEN '300-500'
            WHEN LENGTH(message_text) < 800 THEN '500-800'
            ELSE '800+'
          END AS bucket,
          status
        FROM messages
        WHERE created_at > NOW() - INTERVAL '${range} days'
      )
      SELECT
        bucket,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'replied') AS replied
      FROM bucketed
      GROUP BY 1
      ORDER BY 1
    `;

    const [msgR, hmR, lenR] = await Promise.all([
      pool.query(msgSql),
      pool.query(heatmapSql),
      pool.query(lengthSql),
    ]);

    // Regrouper les messages générés par l'agent en PATTERNS normalisés
    type Group = { pattern: string; tag: string; sent: number; replied: number; totalLen: number };
    const groups = new Map<string, Group>();
    for (const m of msgR.rows) {
      const normalized = normalizePattern(
        m.message_text,
        m.recipient_name,
        m.recipient_company,
        m.recipient_role
      );
      if (!normalized || normalized.length < 5) continue;
      const key = normalized.toLowerCase();
      let g = groups.get(key);
      if (!g) {
        g = { pattern: normalized, tag: m.message_type || "message", sent: 0, replied: 0, totalLen: 0 };
        groups.set(key, g);
      }
      g.sent += 1;
      g.totalLen += (m.message_text || "").length;
      if (m.status === "replied" || m.status === "converted") g.replied += 1;
    }

    // Construire la liste des patterns (= «templates» générés par l'agent)
    const templates = Array.from(groups.values())
      .map((g, i) => ({
        id: i + 1,
        name: patternName(g.pattern, i),
        tag: g.tag,
        pattern: g.pattern,
        usage: g.sent,
        conversion: g.sent > 0 ? Math.round((g.replied / g.sent) * 100) : 0,
        length: g.sent > 0 ? Math.round(g.totalLen / g.sent) : 0,
      }))
      .sort((a, b) => b.conversion - a.conversion || b.usage - a.usage)
      .slice(0, 50);

    // N-grams (mots) — patterns top conversion (>= médiane)
    const sortedConv = [...templates].sort((a, b) => b.conversion - a.conversion);
    const topHalf = sortedConv.slice(0, Math.max(1, Math.floor(sortedConv.length / 2)));
    const topIds = new Set(topHalf.map(t => t.id));
    const wordScores: Record<string, { good: number; bad: number }> = {};
    for (const t of templates) {
      const isGood = topIds.has(t.id);
      const ws = tokens(t.pattern || "");
      for (const w of ws) {
        if (!wordScores[w]) wordScores[w] = { good: 0, bad: 0 };
        if (isGood) wordScores[w].good += 1;
        else wordScores[w].bad += 1;
      }
    }
    const winningWords = Object.entries(wordScores)
      .map(([w, s]) => ({ word: w, score: s.good - s.bad, good: s.good, bad: s.bad }))
      .filter(x => x.good >= 1)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);

    // Heatmap normalisée (taux de réponse %)
    const heatmap = hmR.rows.map(r => {
      const sent = parseInt(r.sent) || 0;
      const replied = parseInt(r.replied) || 0;
      return {
        dow: parseInt(r.dow),
        hour: parseInt(r.hour),
        sent,
        replied,
        rate: sent > 0 ? Math.round((replied / sent) * 100) : 0,
      };
    });

    const lengthBuckets = lenR.rows.map(r => {
      const total = parseInt(r.total) || 0;
      const replied = parseInt(r.replied) || 0;
      return {
        bucket: r.bucket,
        total,
        replied,
        rate: total > 0 ? Math.round((replied / total) * 100) : 0,
      };
    });

    return NextResponse.json({
      success: true,
      templates,
      winningWords,
      heatmap,
      lengthBuckets,
      range,
    });
  } catch (error) {
    console.error("GET /api/bi/templates error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
