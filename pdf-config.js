module.exports = {
  pdf_options: {
    format: "A4",
    margin: "20mm 18mm 20mm 18mm",
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: `
      <div style="font-size:9px; width:100%; padding: 0 18mm; color:#6b7280; display:flex; justify-content:space-between;">
        <span>Rapport DevOps — Qlinqen LinkedIn Agent</span>
        <span>Méthodologie Scrum (7 Sprints)</span>
      </div>
    `,
    footerTemplate: `
      <div style="font-size:9px; width:100%; padding: 0 18mm; color:#6b7280; display:flex; justify-content:space-between;">
        <span>© 2026 — Stage de fin d'études</span>
        <span>Page <span class="pageNumber"></span> / <span class="totalPages"></span></span>
      </div>
    `,
  },
  stylesheet_encoding: "utf-8",
  body_class: "report",
  marked_options: {
    headerIds: true,
    smartypants: true,
  },
  css: `
    @page { size: A4; }
    body.report {
      font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #1f2937;
      line-height: 1.55;
      font-size: 10.5pt;
      max-width: 100%;
    }
    h1 {
      color: #1e40af;
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 8px;
      page-break-before: always;
      font-size: 22pt;
      margin-top: 0;
    }
    h1:first-of-type { page-break-before: avoid; }
    h2 {
      color: #1e3a8a;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
      margin-top: 30px;
      font-size: 16pt;
    }
    h3 {
      color: #1d4ed8;
      margin-top: 22px;
      font-size: 13pt;
    }
    h4 {
      color: #374151;
      font-size: 11.5pt;
      margin-top: 16px;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 14px 0;
      font-size: 9.5pt;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      border-radius: 6px;
      overflow: hidden;
      page-break-inside: avoid;
    }
    th {
      background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
      color: white;
      padding: 10px 12px;
      text-align: left;
      font-weight: 600;
      border: none;
    }
    td {
      padding: 8px 12px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
    }
    tr:nth-child(even) td { background: #f8fafc; }
    tr:last-child td { border-bottom: none; }
    code {
      background: #f1f5f9;
      color: #be185d;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 9.5pt;
    }
    pre {
      background: #1e293b;
      color: #e2e8f0;
      padding: 14px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 8.5pt;
      line-height: 1.4;
      page-break-inside: avoid;
    }
    pre code {
      background: transparent;
      color: inherit;
      padding: 0;
    }
    blockquote {
      border-left: 4px solid #3b82f6;
      background: #eff6ff;
      padding: 10px 16px;
      margin: 12px 0;
      color: #1e40af;
      font-style: italic;
      border-radius: 0 6px 6px 0;
    }
    ul, ol { margin: 8px 0; padding-left: 24px; }
    li { margin: 4px 0; }
    hr {
      border: none;
      border-top: 2px dashed #cbd5e1;
      margin: 28px 0;
    }
    a { color: #2563eb; text-decoration: none; }
    strong { color: #111827; }

    /* Encadré "Capture d'écran à insérer" */
    li:has(> strong:first-child)::marker { color: #3b82f6; }

    /* Page de garde */
    body.report > h1:first-child {
      page-break-before: avoid;
      text-align: center;
      font-size: 28pt;
      padding: 60px 0 20px 0;
      border-bottom: 4px double #3b82f6;
    }

    /* Tables avec emojis dans les en-têtes */
    th { white-space: nowrap; }

    /* Sections importantes en relief */
    h2:contains("Conclusion"), h2:contains("Synthèse") {
      background: linear-gradient(135deg, #dbeafe 0%, #ede9fe 100%);
      padding: 12px 16px;
      border-radius: 8px;
      border-left: 5px solid #3b82f6;
    }

    /* Empêcher coupures dans les tableaux */
    table, tr { page-break-inside: avoid; }
    h1, h2, h3 { page-break-after: avoid; }

    /* Diagramme ASCII (pre) lisible */
    pre { font-size: 7.5pt; }
  `,
};
