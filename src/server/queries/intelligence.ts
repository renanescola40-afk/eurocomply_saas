import { getPersonaByCategory, type IntelligencePersona } from '@/lib/news/intelligence-personas';
import { createAdminClient } from '@/lib/supabase/admin';

export type IntelligenceImpact = 'Monitorar' | 'Médio' | 'Alto' | 'Crítico';
export type IntelligenceReliability = 'Alta' | 'Média';
export type IntelligenceSourceType = 'Regulador' | 'Fonte oficial' | 'Instituição europeia' | 'Observatório técnico';

type IntelligenceDatabaseRow = {
  id: string;
  external_id: string | null;
  title: string;
  category: string;
  jurisdiction: string;
  published_at: string | null;
  source_name: string;
  source_type: string | null;
  author: string | null;
  reliability: string | null;
  impact: string | null;
  executive_summary: string;
  internal_analysis: string;
  affected_companies: unknown;
  recommended_actions: unknown;
  reference_label: string | null;
  reference_url: string | null;
  content_rights: string | null;
  premium: boolean | null;
};

export type IntelligenceItem = {
  id: string;
  title: string;
  category: string;
  jurisdiction: string;
  publishedAt: string;
  source: string;
  sourceUrl: string;
  referenceLabel: string;
  sourceType: IntelligenceSourceType;
  author: string;
  reliability: IntelligenceReliability;
  impact: IntelligenceImpact;
  executiveSummary: string;
  risckComplyAnalysis: string;
  affectedCompanies: string[];
  recommendedActions: string[];
  calendarSuggestion: string;
  contentRights: string;
  premium: boolean;
  persona: IntelligencePersona;
  newspaperDeck: string;
  articleParagraphs: string[];
};

function buildArticleParagraphs(item: Pick<IntelligenceItem, 'title' | 'category' | 'jurisdiction' | 'source' | 'executiveSummary' | 'risckComplyAnalysis' | 'affectedCompanies' | 'recommendedActions'>): string[] {
  const affected = item.affectedCompanies.length ? item.affectedCompanies.join(', ') : 'empresas com operação digital, fornecedores tecnológicos e times de compliance';
  const firstAction = item.recommendedActions[0] ?? 'abrir uma revisão interna e documentar a decisão tomada';

  return [
    `${item.title} deixou de ser apenas uma atualização de mercado: para empresas que compram, vendem ou operam tecnologia, o tema passa a tocar governança, orçamento e exposição regulatória. A leitura do RISCK COMPLY é que a notícia precisa ser tratada como sinal de decisão, não como ruído informativo.`,
    `A fonte monitorada nesta edição é ${item.source}, com foco em ${item.jurisdiction}. O ponto central é simples: ${item.executiveSummary}`,
    `Para ${affected}, o impacto aparece em contratos, fornecedores, evidências, políticas internas e capacidade de responder a auditorias. Uma empresa que deixa esse tipo de mudança fora do radar tende a descobrir tarde demais que uma decisão técnica virou risco jurídico, operacional ou financeiro.`,
    `${item.risckComplyAnalysis} O primeiro movimento recomendado pela redação é ${firstAction.toLowerCase()}.`,
    'Esta matéria é uma síntese editorial própria do RISCK COMPLY Intelligence. A referência, a data e a fonte original permanecem visíveis para que o leitor possa verificar a origem; o produto não substitui aconselhamento jurídico.',
  ];
}

function buildNewspaperDeck(summary: string) {
  return summary.length > 180 ? `${summary.slice(0, 177).trim()}...` : summary;
}

function mapSourceType(sourceType: string | null | undefined): IntelligenceSourceType {
  if (sourceType === 'regulator') return 'Regulador';
  if (sourceType === 'institution') return 'Instituição europeia';
  if (sourceType === 'technical_observatory') return 'Observatório técnico';
  return 'Fonte oficial';
}

function mapReliability(reliability: string | null | undefined): IntelligenceReliability {
  return reliability === 'medium' || reliability === 'low' ? 'Média' : 'Alta';
}

function mapImpact(impact: string | null | undefined): IntelligenceImpact {
  if (impact === 'critical') return 'Crítico';
  if (impact === 'high') return 'Alto';
  if (impact === 'medium') return 'Médio';
  return 'Monitorar';
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizeVerifiedSourceUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function mapDatabaseItem(item: IntelligenceDatabaseRow): IntelligenceItem | null {
  const sourceUrl = normalizeVerifiedSourceUrl(item.reference_url);
  if (!item.published_at || !sourceUrl) return null;

  const base = {
    id: item.external_id ?? item.id,
    title: item.title,
    category: item.category,
    jurisdiction: item.jurisdiction,
    publishedAt: item.published_at,
    source: item.source_name,
    sourceUrl,
    referenceLabel: item.reference_label?.trim() || item.source_name,
    sourceType: mapSourceType(item.source_type),
    author: item.author ?? 'RISCK COMPLY Intelligence Desk',
    reliability: mapReliability(item.reliability),
    impact: mapImpact(item.impact),
    executiveSummary: item.executive_summary,
    risckComplyAnalysis: item.internal_analysis,
    affectedCompanies: normalizeStringArray(item.affected_companies),
    recommendedActions: normalizeStringArray(item.recommended_actions),
    calendarSuggestion: item.impact === 'high' || item.impact === 'critical' ? 'Criar revisão no calendário inteligente em até 30 dias.' : 'Monitorar e criar tarefa se houver impacto direto na empresa.',
    contentRights: item.content_rights ?? 'metadata_and_analysis_only',
    premium: Boolean(item.premium),
    persona: getPersonaByCategory(item.category),
  };

  return {
    ...base,
    newspaperDeck: buildNewspaperDeck(base.executiveSummary),
    articleParagraphs: buildArticleParagraphs(base),
  };
}

const intelligenceSelect = 'id,external_id,title,category,jurisdiction,published_at,source_name,source_type,author,reliability,impact,executive_summary,internal_analysis,affected_companies,recommended_actions,reference_label,reference_url,content_rights,premium';

function intelligenceReadError(operation: string, code?: string | null): Error {
  console.error('Intelligence read failed', { operation, code: code ?? 'unknown' });
  return new Error('intelligence_content_unavailable');
}

export async function listPublishedIntelligenceItems(): Promise<IntelligenceItem[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('intelligence_items')
    .select(intelligenceSelect)
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .not('reference_url', 'is', null)
    .order('published_at', { ascending: false })
    .limit(50);

  if (error) throw intelligenceReadError('list_published', error.code);
  if (!data?.length) return [];
  return (data as IntelligenceDatabaseRow[])
    .map((item) => mapDatabaseItem(item))
    .filter((item): item is IntelligenceItem => item !== null);
}

export async function getPublishedIntelligenceItem(id: string): Promise<IntelligenceItem | null> {
  const supabase = createAdminClient();

  const { data: externalMatch, error: externalError } = await supabase
    .from('intelligence_items')
    .select(intelligenceSelect)
    .eq('status', 'published')
    .eq('external_id', id)
    .maybeSingle();

  if (externalError) throw intelligenceReadError('get_published_external_id', externalError.code);
  if (externalMatch) return mapDatabaseItem(externalMatch as IntelligenceDatabaseRow);
  if (!isUuid(id)) return null;

  const { data: uuidMatch, error: uuidError } = await supabase
    .from('intelligence_items')
    .select(intelligenceSelect)
    .eq('status', 'published')
    .eq('id', id)
    .maybeSingle();

  if (uuidError) throw intelligenceReadError('get_published_uuid', uuidError.code);
  if (!uuidMatch) return null;

  return mapDatabaseItem(uuidMatch as IntelligenceDatabaseRow);
}
