type GapReportLocale = 'en' | 'pt' | 'es' | 'fr' | 'it' | 'de';

type GapReportAction = {
  article: string;
  recommendation: string;
  severity: 'critical' | 'medium';
};

type GapReportAnswer = {
  article: string;
  category: string;
  question: string;
  answer: string;
  score: number;
  recommendation: string;
};

type GapReportArticle = {
  article: string;
  score: number;
};

type GapReportLabels = {
  title: string;
  subtitle: string;
  score: string;
  status: string;
  generatedBy: string;
  generatedAt: string;
  company: string;
  organization: string;
  questions: string;
  articleBreakdown: string;
  actionPlan: string;
  noActions: string;
  questionnaire: string;
  answer: string;
  recommendation: string;
  severity: string;
  critical: string;
  medium: string;
  executiveSummary: string;
  scope: string;
};

export type GapAnalysisPdfReportInput = {
  locale: GapReportLocale;
  generatedAt: Date;
  generatedBy: {
    name: string;
    email: string;
  };
  companyName: string;
  organizationName: string;
  score: number;
  statusLabel: string;
  completed: number;
  total: number;
  articleBreakdown: GapReportArticle[];
  answers: GapReportAnswer[];
  actions: GapReportAction[];
  labels: GapReportLabels;
};

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(date: Date, locale: GapReportLocale) {
  const localeMap: Record<GapReportLocale, string> = {
    en: 'en-GB',
    pt: 'pt-PT',
    es: 'es-ES',
    fr: 'fr-FR',
    it: 'it-IT',
    de: 'de-DE',
  };

  return new Intl.DateTimeFormat(localeMap[locale], {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function slugDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function scoreClass(score: number) {
  if (score >= 80) return 'good';
  if (score >= 50) return 'warn';
  return 'risk';
}

function severityClass(severity: GapReportAction['severity']) {
  return severity === 'critical' ? 'risk' : 'warn';
}

function buildReportHtml(input: GapAnalysisPdfReportInput) {
  const generatedAt = formatDate(input.generatedAt, input.locale);
  const articleRows = input.articleBreakdown
    .map((item) => `
      <tr>
        <td>${escapeHtml(item.article)}</td>
        <td class="score-cell ${scoreClass(item.score)}">${escapeHtml(item.score)}%</td>
      </tr>
    `)
    .join('');

  const answerRows = input.answers
    .map((item) => `
      <tr>
        <td>${escapeHtml(item.article)}</td>
        <td>${escapeHtml(item.category)}</td>
        <td>${escapeHtml(item.question)}</td>
        <td>${escapeHtml(item.answer)}</td>
        <td class="score-cell ${scoreClass(item.score)}">${escapeHtml(item.score)}%</td>
      </tr>
    `)
    .join('');

  const actionRows = input.actions.length
    ? input.actions
        .map((action, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(action.article)}</td>
            <td><span class="badge ${severityClass(action.severity)}">${escapeHtml(action.severity === 'critical' ? input.labels.critical : input.labels.medium)}</span></td>
            <td>${escapeHtml(action.recommendation)}</td>
          </tr>
        `)
        .join('')
    : `<tr><td colspan="4">${escapeHtml(input.labels.noActions)}</td></tr>`;

  return `<!doctype html>
<html lang="${escapeHtml(input.locale)}">
<head>
  <meta charset="utf-8" />
  <title>EuroComply - EU AI Act Gap Analysis - ${slugDate(input.generatedAt)}</title>
  <style>
    @page { size: A4; margin: 18mm 16mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #f4f6fb;
      color: #111827;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.5;
    }
    .page {
      max-width: 940px;
      margin: 0 auto;
      background: #fff;
      padding: 40px;
    }
    .topbar {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 24px;
      margin-bottom: 30px;
    }
    .brand {
      color: #0f172a;
      font-size: 21px;
      font-weight: 800;
      letter-spacing: -0.03em;
    }
    .brand span { color: #2563eb; }
    .doc-type {
      color: #64748b;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }
    h1 {
      margin: 0 0 10px;
      color: #0f172a;
      font-size: 32px;
      line-height: 1.08;
      letter-spacing: -0.04em;
    }
    h2 {
      margin: 30px 0 12px;
      color: #0f172a;
      font-size: 18px;
      letter-spacing: -0.02em;
    }
    p { margin: 0; color: #475569; }
    .meta-grid, .summary-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin: 20px 0;
    }
    .meta-card, .summary-card {
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      padding: 14px 16px;
      background: #f8fafc;
    }
    .meta-label, .summary-label {
      color: #64748b;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .meta-value, .summary-value {
      margin-top: 5px;
      color: #0f172a;
      font-size: 14px;
      font-weight: 650;
      word-break: break-word;
    }
    .score-hero {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      border: 1px solid #dbeafe;
      border-radius: 22px;
      background: linear-gradient(135deg, #eff6ff, #ffffff 62%);
      padding: 22px 24px;
      margin: 24px 0;
    }
    .score-number {
      color: #0f172a;
      font-size: 52px;
      font-weight: 800;
      letter-spacing: -0.06em;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 750;
    }
    .badge.good, .score-cell.good { color: #047857; }
    .badge.warn, .score-cell.warn { color: #b45309; }
    .badge.risk, .score-cell.risk { color: #b91c1c; }
    .badge.good { background: #ecfdf5; border: 1px solid #a7f3d0; }
    .badge.warn { background: #fffbeb; border: 1px solid #fde68a; }
    .badge.risk { background: #fef2f2; border: 1px solid #fecaca; }
    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      overflow: hidden;
      page-break-inside: avoid;
    }
    th, td {
      border-bottom: 1px solid #e5e7eb;
      padding: 10px 12px;
      text-align: left;
      vertical-align: top;
      font-size: 12px;
    }
    th {
      background: #f8fafc;
      color: #334155;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    tr:last-child td { border-bottom: 0; }
    .score-cell { font-weight: 800; white-space: nowrap; }
    .footer {
      margin-top: 36px;
      border-top: 1px solid #e5e7eb;
      padding-top: 16px;
      color: #64748b;
      font-size: 11px;
    }
    .print-note {
      position: sticky;
      top: 0;
      z-index: 10;
      background: #0f172a;
      color: white;
      padding: 10px 16px;
      text-align: center;
      font-size: 13px;
    }
    @media print {
      body { background: white; }
      .page { max-width: none; padding: 0; }
      .print-note { display: none; }
      h2 { page-break-after: avoid; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="print-note">Use o destino “Guardar como PDF / Save as PDF” para baixar o relatório empresarial.</div>
  <main class="page">
    <header class="topbar">
      <div>
        <div class="brand">Euro<span>Comply</span></div>
        <div class="doc-type">${escapeHtml(input.labels.title)}</div>
      </div>
      <div style="text-align:right">
        <div class="meta-label">${escapeHtml(input.labels.generatedAt)}</div>
        <div class="meta-value">${escapeHtml(generatedAt)}</div>
      </div>
    </header>

    <section>
      <h1>${escapeHtml(input.labels.title)}</h1>
      <p>${escapeHtml(input.labels.subtitle)}</p>
    </section>

    <section class="meta-grid">
      <div class="meta-card">
        <div class="meta-label">${escapeHtml(input.labels.generatedBy)}</div>
        <div class="meta-value">${escapeHtml(input.generatedBy.name)}</div>
        <p>${escapeHtml(input.generatedBy.email)}</p>
      </div>
      <div class="meta-card">
        <div class="meta-label">${escapeHtml(input.labels.company)}</div>
        <div class="meta-value">${escapeHtml(input.companyName)}</div>
        <p>${escapeHtml(input.labels.organization)}: ${escapeHtml(input.organizationName)}</p>
      </div>
    </section>

    <section class="score-hero">
      <div>
        <div class="summary-label">${escapeHtml(input.labels.score)}</div>
        <div class="score-number">${escapeHtml(input.score)}%</div>
      </div>
      <div>
        <span class="badge ${scoreClass(input.score)}">${escapeHtml(input.statusLabel)}</span>
        <p style="margin-top:10px">${escapeHtml(input.completed)}/${escapeHtml(input.total)} ${escapeHtml(input.labels.questions)}</p>
      </div>
    </section>

    <section>
      <h2>${escapeHtml(input.labels.executiveSummary)}</h2>
      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-label">${escapeHtml(input.labels.score)}</div>
          <div class="summary-value">${escapeHtml(input.score)}% · ${escapeHtml(input.statusLabel)}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">${escapeHtml(input.labels.actionPlan)}</div>
          <div class="summary-value">${escapeHtml(input.actions.length)} ${escapeHtml(input.labels.actionPlan).toLowerCase()}</div>
        </div>
      </div>
    </section>

    <section>
      <h2>${escapeHtml(input.labels.articleBreakdown)}</h2>
      <table>
        <thead><tr><th>Artigo</th><th>${escapeHtml(input.labels.score)}</th></tr></thead>
        <tbody>${articleRows}</tbody>
      </table>
    </section>

    <section>
      <h2>${escapeHtml(input.labels.actionPlan)}</h2>
      <table>
        <thead><tr><th>#</th><th>Artigo</th><th>${escapeHtml(input.labels.severity)}</th><th>${escapeHtml(input.labels.recommendation)}</th></tr></thead>
        <tbody>${actionRows}</tbody>
      </table>
    </section>

    <section>
      <h2>${escapeHtml(input.labels.questionnaire)}</h2>
      <table>
        <thead><tr><th>Artigo</th><th>Área</th><th>Pergunta</th><th>${escapeHtml(input.labels.answer)}</th><th>${escapeHtml(input.labels.score)}</th></tr></thead>
        <tbody>${answerRows}</tbody>
      </table>
    </section>

    <footer class="footer">
      ${escapeHtml(input.labels.scope)}<br />
      EuroComply SaaS · ${escapeHtml(input.labels.generatedAt)} ${escapeHtml(generatedAt)}
    </footer>
  </main>
  <script>
    window.addEventListener('load', () => {
      setTimeout(() => window.print(), 350);
    });
  </script>
</body>
</html>`;
}

export function openGapAnalysisPdfReport(input: GapAnalysisPdfReportInput) {
  const html = buildReportHtml(input);
  const reportWindow = window.open('', '_blank', 'noopener,noreferrer,width=1024,height=768');

  if (!reportWindow) {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `eurocomply-eu-ai-act-gap-analysis-${slugDate(input.generatedAt)}.html`;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }

  reportWindow.document.open();
  reportWindow.document.write(html);
  reportWindow.document.close();
  reportWindow.focus();
}
