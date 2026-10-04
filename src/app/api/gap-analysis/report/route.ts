import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { parseJsonBodyWithZod, requireApiUser, secureApiError } from '@/server/security/api-guards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  assessmentId: z.string().uuid(),
  locale: z.enum(['pt', 'en', 'es', 'fr', 'it', 'de']).default('en'),
});

type PdfLine = { text: string; bold?: boolean; size?: number; x?: number; gap?: number };
type AssessmentAnswer = {
  question_id: string;
  article: string;
  category: string;
  answer: 'yes' | 'partial' | 'no';
  score: number;
  recommendation: string | null;
};

const QUESTIONS: Record<string, { pt: string; en: string }> = {
  'art9-risk-process': {
    pt: 'Existe processo formal de gestão de risco de IA?',
    en: 'Is there a formal AI risk management process?',
  },
  'art9-mitigation': {
    pt: 'As ações de mitigação são documentadas e revisadas periodicamente?',
    en: 'Are mitigation actions documented and reviewed periodically?',
  },
  'art10-data-docs': {
    pt: 'Os datasets são documentados, rastreáveis e controlados por qualidade?',
    en: 'Are datasets documented, traceable and quality controlled?',
  },
  'art12-logging': {
    pt: 'O sistema gera e armazena logs adequados?',
    en: 'Does the system generate and retain appropriate logs?',
  },
  'art13-transparency': {
    pt: 'Os utilizadores são informados de que interagem ou são impactados por IA?',
    en: 'Are users informed that they interact with or are impacted by AI?',
  },
  'art14-human-oversight': {
    pt: 'Uma pessoa qualificada pode supervisionar e interromper decisões automatizadas?',
    en: 'Can a qualified human oversee and interrupt automated decisions?',
  },
  'art15-robustness': {
    pt: 'Robustez, cibersegurança e incidentes são testados?',
    en: 'Are robustness, cybersecurity and incident procedures tested?',
  },
};

function safeText(value: unknown) {
  return String(value ?? '')
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, '...')
    .replace(/[^ -~ -ÿ]/g, '?')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function wrap(text: string, width = 86) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? current + ' ' + word : word;
    if (candidate.length > width && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function formatDate(date: Date, locale: string) {
  if (locale === 'pt') {
    return new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  }
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function scoreStatus(score: number, locale: string) {
  if (locale === 'pt') {
    if (score >= 80) return 'Prontidão elevada';
    if (score >= 50) return 'Precisa de atenção';
    return 'Lacuna crítica';
  }
  if (score >= 80) return 'High readiness';
  if (score >= 50) return 'Needs attention';
  return 'Critical gap';
}

function answerLabel(answer: AssessmentAnswer['answer'], locale: string) {
  if (locale === 'pt') return answer === 'yes' ? 'Sim' : answer === 'partial' ? 'Parcial' : 'Não';
  return answer === 'yes' ? 'Yes' : answer === 'partial' ? 'Partial' : 'No';
}

function severityLabel(score: number, locale: string) {
  if (locale === 'pt') return score === 0 ? 'Crítica' : score === 50 ? 'Média' : 'Baixa';
  return score === 0 ? 'Critical' : score === 50 ? 'Medium' : 'Low';
}

function articleScores(answers: AssessmentAnswer[]) {
  const grouped = new Map<string, number[]>();
  for (const answer of answers) {
    const values = grouped.get(answer.article) ?? [];
    values.push(Number(answer.score) || 0);
    grouped.set(answer.article, values);
  }
  return Array.from(grouped.entries()).map(([article, values]) => ({
    article,
    score: Math.round(values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1)),
  }));
}

function deterministicSummary(score: number, answers: AssessmentAnswer[], locale: string) {
  const critical = answers.filter((item) => item.score === 0);
  const medium = answers.filter((item) => item.score === 50);
  const criticalDomain = critical[0]?.category;
  if (locale === 'pt') {
    const base = score >= 80
      ? 'A avaliação atual indica prontidão elevada nos controlos avaliados do EU AI Act.'
      : score >= 50
        ? 'A avaliação atual indica prontidão parcial nos controlos avaliados do EU AI Act.'
        : 'A avaliação atual indica lacunas relevantes nos controlos avaliados do EU AI Act.';
    const priority = criticalDomain
      ? ` A prioridade imediata é reforçar ${criticalDomain.toLowerCase()} e reunir evidências de suporte.`
      : medium.length
        ? ' Recomenda-se concluir as ações de melhoria pendentes e validar as evidências associadas.'
        : ' Recomenda-se manter as evidências atualizadas e rever periodicamente os controlos.';
    return base + priority;
  }
  const base = score >= 80
    ? 'The current assessment indicates high readiness across the evaluated EU AI Act controls.'
    : score >= 50
      ? 'The current assessment indicates partial readiness across the evaluated EU AI Act controls.'
      : 'The current assessment indicates material gaps across the evaluated EU AI Act controls.';
  const priority = criticalDomain
    ? ` Immediate priority should be given to strengthening ${criticalDomain.toLowerCase()} and collecting supporting evidence.`
    : medium.length
      ? ' The remaining improvement actions should be completed and supported with evidence.'
      : ' Supporting evidence should remain current and controls should be reviewed periodically.';
  return base + priority;
}

function pageStream(lines: PdfLine[], pageNumber: number, totalPages: number, cover = false) {
  const commands: string[] = [];
  if (cover) {
    commands.push('0.035 0.055 0.09 rg 0 0 595 842 re f');
    commands.push('0.18 0.82 0.66 rg 48 720 70 4 re f');
  } else {
    commands.push('0.97 0.98 0.99 rg 0 0 595 842 re f');
    commands.push('1 1 1 rg 32 32 531 778 re f');
    commands.push('0.035 0.055 0.09 rg 32 770 531 40 re f');
    commands.push(`BT /F2 9 Tf 48 786 Td (${safeText('RISCK COMPLY')}) Tj ET`);
  }

  let y = cover ? 665 : 742;
  for (const line of lines) {
    y -= line.gap ?? 20;
    const font = line.bold ? 'F2' : 'F1';
    const size = line.size ?? 10.5;
    const x = line.x ?? 48;
    commands.push(`BT /${font} ${size} Tf ${x} ${y} Td (${safeText(line.text)}) Tj ET`);
  }

  if (!cover) {
    commands.push('0.75 0.78 0.82 RG 48 54 m 547 54 l S');
    commands.push(`BT /F1 8 Tf 48 38 Td (${safeText('RISCK COMPLY  |  CONFIDENTIAL')}) Tj ET`);
    commands.push(`BT /F1 8 Tf 472 38 Td (${safeText(`Page ${pageNumber} of ${totalPages}`)}) Tj ET`);
  }
  return commands.join('\n');
}

function buildPdf(pages: string[], generatedAt: Date) {
  const objects: Buffer[] = [];
  const add = (value: string) => {
    objects.push(Buffer.from(value, 'latin1'));
    return objects.length;
  };

  const catalogId = add('');
  const pagesId = add('');
  const fontRegularId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const fontBoldId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const pageIds: number[] = [];

  for (const content of pages) {
    const contentBuffer = Buffer.from(content, 'latin1');
    const contentId = add(`<< /Length ${contentBuffer.length} >>\nstream\n${content}\nendstream`);
    const pageId = add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  }

  const infoId = add(`<< /Title (RISCK COMPLY - EU AI Act Gap Analysis Report) /Author (RISCK COMPLY) /Subject (AI Governance & EU AI Act Readiness Assessment) /Creator (RISCK COMPLY) /CreationDate (D:${generatedAt.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)}Z) >>`);
  objects[catalogId - 1] = Buffer.from(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`, 'latin1');
  objects[pagesId - 1] = Buffer.from(`<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] >>`, 'latin1');

  const header = Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'latin1');
  const parts: Buffer[] = [header];
  const offsets = [0];
  let offset = header.length;

  objects.forEach((object, index) => {
    offsets[index + 1] = offset;
    const prefix = Buffer.from(`${index + 1} 0 obj\n`, 'latin1');
    const suffix = Buffer.from('\nendobj\n', 'latin1');
    parts.push(prefix, object, suffix);
    offset += prefix.length + object.length + suffix.length;
  });

  const xrefOffset = offset;
  const xrefLines = ['xref', `0 ${objects.length + 1}`, '0000000000 65535 f '];
  for (let i = 1; i <= objects.length; i += 1) {
    xrefLines.push(String(offsets[i]).padStart(10, '0') + ' 00000 n ');
  }
  const trailer = Buffer.from(
    xrefLines.join('\n') +
      `\ntrailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
    'latin1',
  );
  parts.push(trailer);
  return Buffer.concat(parts);
}

function buildCorporatePdf(input: {
  locale: string;
  organizationName: string;
  score: number;
  answers: AssessmentAnswer[];
  actions: Array<{ article: string; title: string; status: string; priority: string; due_date: string | null }>;
  generatedAt: Date;
}) {
  const pt = input.locale === 'pt';
  const date = formatDate(input.generatedAt, input.locale);
  const status = scoreStatus(input.score, input.locale);
  const scores = articleScores(input.answers);
  const critical = input.answers.filter((item) => item.score === 0).length;
  const medium = input.answers.filter((item) => item.score === 50).length;
  const openActions = input.actions.filter((item) => item.status !== 'completed' && item.status !== 'closed').length;
  const summary = deterministicSummary(input.score, input.answers, input.locale);
  const pages: string[] = [];

  pages.push(pageStream([
    { text: 'RISCK COMPLY', bold: true, size: 18, gap: 0 },
    { text: 'EU AI ACT', bold: true, size: 30, gap: 95 },
    { text: pt ? 'RELATÓRIO DE GAP ANALYSIS' : 'GAP ANALYSIS REPORT', bold: true, size: 24, gap: 34 },
    { text: 'AI Governance & Compliance Readiness Assessment', size: 12, gap: 28 },
    { text: input.organizationName, bold: true, size: 14, gap: 72 },
    { text: `${pt ? 'Data do relatório' : 'Report date'}: ${date}`, size: 10.5 },
    { text: `${pt ? 'Versão' : 'Version'}: 1.0`, size: 10.5 },
    { text: `${pt ? 'Score geral de prontidão' : 'Overall readiness score'}: ${input.score}%`, bold: true, size: 18, gap: 34 },
    { text: `${pt ? 'Estado' : 'Status'}: ${status}`, bold: true, size: 12 },
    { text: 'CONFIDENTIAL', bold: true, size: 10, gap: 72 },
    { text: pt ? 'Preparado com RISCK COMPLY' : 'Prepared with RISCK COMPLY', size: 9 },
  ], 1, 7, true));

  const execLines: PdfLine[] = [
    { text: pt ? 'Resumo executivo' : 'Executive summary', bold: true, size: 22, gap: 0 },
    { text: `${pt ? 'Score geral' : 'Overall score'}: ${input.score}% - ${status}`, bold: true, size: 14, gap: 34 },
    { text: `${pt ? 'Perguntas respondidas' : 'Answered questions'}: ${input.answers.length}/7` },
    { text: `${pt ? 'Lacunas críticas' : 'Critical gaps'}: ${critical}` },
    { text: `${pt ? 'Riscos médios' : 'Medium risks'}: ${medium}` },
    { text: `${pt ? 'Ações abertas' : 'Open actions'}: ${openActions}` },
    { text: pt ? 'Síntese determinística' : 'Deterministic summary', bold: true, size: 12, gap: 30 },
    ...wrap(summary, 82).map((text) => ({ text, size: 10.5, gap: 15 })),
  ];
  pages.push(pageStream(execLines, 2, 7));

  const scoreLines: PdfLine[] = [
    { text: pt ? 'Scorecard por artigo' : 'Scorecard by article', bold: true, size: 22, gap: 0 },
    { text: pt ? 'Artigo | Domínio | Score | Estado' : 'Article | Domain | Score | Status', bold: true, size: 10, gap: 34 },
  ];
  for (const item of scores) {
    const domain = input.answers.find((answer) => answer.article === item.article)?.category ?? '-';
    scoreLines.push({ text: `${item.article} | ${domain} | ${item.score}% | ${scoreStatus(item.score, input.locale)}`, gap: 24 });
  }
  pages.push(pageStream(scoreLines, 3, 7));

  const findingLines: PdfLine[] = [
    { text: pt ? 'Achados' : 'Findings', bold: true, size: 22, gap: 0 },
  ];
  for (const answer of input.answers) {
    findingLines.push({ text: `${answer.article} - ${answer.category}`, bold: true, size: 11, gap: 24 });
    const question = QUESTIONS[answer.question_id]?.[pt ? 'pt' : 'en'] ?? answer.question_id;
    for (const text of wrap(question, 82)) findingLines.push({ text, gap: 14 });
    findingLines.push({ text: `${pt ? 'Resposta' : 'Answer'}: ${answerLabel(answer.answer, input.locale)} | ${pt ? 'Severidade' : 'Severity'}: ${severityLabel(answer.score, input.locale)}`, gap: 14 });
    for (const text of wrap(answer.recommendation || (pt ? 'Sem ação recomendada.' : 'No recommended action.'), 82)) {
      findingLines.push({ text: `${pt ? 'Ação' : 'Action'}: ${text}`, gap: 14 });
    }
  }
  pages.push(pageStream(findingLines.slice(0, 34), 4, 7));

  const actionLines: PdfLine[] = [{ text: pt ? 'Plano de ação' : 'Action plan', bold: true, size: 22, gap: 0 }];
  if (!input.actions.length) actionLines.push({ text: pt ? 'Nenhuma ação aberta associada a esta avaliação.' : 'No open actions are associated with this assessment.', gap: 34 });
  for (const [index, action] of input.actions.entries()) {
    actionLines.push({ text: `${index + 1}. ${action.article} | ${action.priority} | ${action.status}`, bold: true, size: 10.5, gap: 24 });
    for (const text of wrap(action.title, 78)) actionLines.push({ text, gap: 14 });
    actionLines.push({ text: `${pt ? 'Responsável' : 'Owner'}: ${pt ? 'Não atribuído' : 'Not assigned'} | ${pt ? 'Prazo' : 'Due date'}: ${action.due_date || (pt ? 'Não atribuído' : 'Not assigned')}`, gap: 14 });
  }
  pages.push(pageStream(actionLines.slice(0, 35), 5, 7));

  pages.push(pageStream([
    { text: pt ? 'Resumo de risco' : 'Risk summary', bold: true, size: 22, gap: 0 },
    { text: `${pt ? 'Lacunas críticas' : 'Critical gaps'}: ${critical}`, bold: true, size: 13, gap: 38 },
    { text: `${pt ? 'Riscos médios' : 'Medium risks'}: ${medium}`, bold: true, size: 13 },
    { text: `${pt ? 'Ações abertas' : 'Open actions'}: ${openActions}`, bold: true, size: 13 },
    { text: pt ? 'A matriz de risco não é inferida quando não existem dados suficientes no produto.' : 'A risk matrix is not inferred when the product does not hold sufficient supporting data.', gap: 34 },
  ], 6, 7));

  pages.push(pageStream([
    { text: pt ? 'Metodologia' : 'Methodology', bold: true, size: 22, gap: 0 },
    { text: pt ? 'A avaliação baseia-se nas respostas fornecidas pelo utilizador.' : 'The assessment is based on user-supplied responses.', gap: 38 },
    { text: pt ? 'O score representa prontidão e análise de lacunas; não é uma certificação.' : 'The score represents readiness and gap analysis; it is not a certification.' },
    { text: pt ? 'O relatório não substitui aconselhamento jurídico.' : 'This report does not replace legal advice.' },
    { text: pt ? 'Os resultados devem ser revistos juntamente com as evidências de suporte.' : 'Results should be reviewed together with supporting evidence.' },
    { text: pt ? 'Referências avaliadas: Artigos 9, 10, 12, 13, 14 e 15 do EU AI Act.' : 'Evaluated references: EU AI Act Articles 9, 10, 12, 13, 14 and 15.', gap: 28 },
  ], 7, 7));

  return buildPdf(pages, input.generatedAt);
}

export async function POST(request: Request) {
  try {
    const originDenied = assertTrustedOrigin(request);
    if (originDenied) return originDenied;

    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) return Response.json({ error: 'organization_required' }, { status: 403 });

    const authorization = await assertOrganizationPermission({
      userId: user.id,
      organizationId: organization.id,
      permission: 'read_ai_governance',
    });
    if (!authorization.ok) return permissionDeniedResponse(authorization);

    const body = await parseJsonBodyWithZod(request, { schema: bodySchema, maxBytes: 8 * 1024 });
    const supabase = createAdminClient();

    const { data: assessment, error: assessmentError } = await supabase
      .from('gap_assessments')
      .select('id,score,locale,created_at')
      .eq('id', body.assessmentId)
      .eq('organization_id', organization.id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (assessmentError) throw assessmentError;
    if (!assessment) return Response.json({ error: 'assessment_not_found' }, { status: 404 });

    const { data: answers, error: answersError } = await supabase
      .from('gap_answers')
      .select('question_id,article,category,answer,score,recommendation')
      .eq('assessment_id', assessment.id);
    if (answersError) throw answersError;

    const { data: findings, error: findingsError } = await supabase
      .from('compliance_findings')
      .select('id,article,title,severity,status,due_date')
      .eq('assessment_id', assessment.id)
      .eq('organization_id', organization.id)
      .eq('user_id', user.id);
    if (findingsError) throw findingsError;

    const generatedAt = new Date();
    const pdf = buildCorporatePdf({
      locale: body.locale,
      organizationName: organization.name || (body.locale === 'pt' ? 'Organização' : 'Organization'),
      score: assessment.score,
      answers: (answers ?? []) as AssessmentAnswer[],
      actions: (findings ?? []).map((item) => ({
        article: item.article,
        title: item.title,
        status: item.status,
        priority: item.severity,
        due_date: item.due_date,
      })),
      generatedAt,
    });

    const filename = `RISCK-COMPLY_Gap-Analysis_${generatedAt.toISOString().slice(0, 10)}.pdf`;
    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return secureApiError(error);
  }
}
