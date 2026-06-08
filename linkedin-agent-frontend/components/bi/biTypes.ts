// Types partagés et helpers pour les modules BI

export type BIRange = 7 | 30 | 90 | 180;

export const RANGE_OPTIONS: { value: BIRange; label: string }[] = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
  { value: 180, label: "6 months" },
];

export function fmt(n: number | undefined | null): string {
  if (n === undefined || n === null || isNaN(n)) return "0";
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return Math.round(n).toString();
}

export function pctColor(delta: number): string {
  if (delta > 0) return "text-emerald-600 bg-emerald-50 border-emerald-100";
  if (delta < 0) return "text-rose-600 bg-rose-50 border-rose-100";
  return "text-gray-500 bg-gray-50 border-gray-100";
}

export function downloadCSV(filename: string, rows: Array<Record<string, any>>) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map(r =>
      headers
        .map(h => {
          const v = r[h];
          if (v === null || v === undefined) return "";
          const s = String(v).replace(/"/g, '""');
          return /[,"\n]/.test(s) ? `"${s}"` : s;
        })
        .join(",")
    ),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
