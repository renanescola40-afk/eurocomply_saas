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
  premium: boolean | null;
};

export type IntelligenceItem = {
  id: string;
  title: string;
  category: string;
  jurisdiction: string;
  publishedAt: string;
  source: string;
  sourceType: IntelligenceSourceType;
  author: string;
  reliability: IntelligenceReliability;
  impact: IntelligenceImpact;
  executiveSummary: string;
  risckComplyAnalysis: string;
  affectedCompanies: string[];
  recommendedActions: string[];
  calendarSuggestion: string;
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
    'Esta matéria é uma síntese editorial própria do RISCK COMPLY Intelligence: ela preserva referência, data, fonte e contexto, mas não republica textos integrais de terceiros. Quando a origem for mídia comercial ou paywall, o produto deve manter metadados e análise própria, apontando o leitor para a fonte original.',
  ];
}

function buildNewspaperDeck(summary: string) {
  return summary.length > 180 ? `${summary.slice(0, 177).trim()}...` : summary;
}

export const fallbackIntelligenceItems: IntelligenceItem[] = [
  {
    id: 'eu-ai-act-high-risk-readiness',
    title: 'EU AI Act: empresas devem preparar evidências para sistemas de IA de alto risco',
    category: 'AI Act',
    jurisdiction: 'União Europeia',
    publishedAt: '2026-06-10',
    source: 'European Commission / EU AI Act policy pages',
    sourceType: 'Instituição europeia',
    author: 'RISCK COMPLY Intelligence Desk',
    reliability: 'Alta',
    impact: 'Alto',
    executiveSummary: 'Empresas que usam ou fornecem sistemas de IA com impacto em pessoas precisam manter inventário, gestão de risco, documentação, supervisão humana e logs auditáveis.',
    risckComplyAnalysis: 'A organização deve mapear sistemas de IA, confirmar o papel contratual e anexar evidências por obrigação. O maior risco é tratar uso operacional externo como simples ferramenta interna.',
    affectedCompanies: ['SaaS B2B', 'Fintech', 'RH e recrutamento', 'Educação', 'Healthtech'],
    recommendedActions: ['Atualizar inventário de IA.', 'Classificar risco AI Act.', 'Criar revisão para sistemas com clientes.', 'Separar evidências de logs e transparência.'],
    calendarSuggestion: 'Criar tarefa de revisão do inventário de IA em 30 dias, prioridade alta.',
    premium: false,
    persona: getPersonaByCategory('AI Act'),
    newspaperDeck: 'O regulador deixou claro que IA de alto risco exige inventário, evidência e supervisão. Para empresas, a notícia vira tarefa operacional.',
    articleParagraphs: buildArticleParagraphs({
      title: 'EU AI Act: empresas devem preparar evidências para sistemas de IA de alto risco',
      category: 'AI Act',
      jurisdiction: 'União Europeia',
      source: 'European Commission / EU AI Act policy pages',
      executiveSummary: 'Empresas que usam ou fornecem sistemas de IA com impacto em pessoas precisam manter inventário, gestão de risco, documentação, supervisão humana e logs auditáveis.',
      risckComplyAnalysis: 'A organização deve mapear sistemas de IA, confirmar o papel contratual e anexar evidências por obrigação. O maior risco é tratar uso operacional externo como simples ferramenta interna.',
      affectedCompanies: ['SaaS B2B', 'Fintech', 'RH e recrutamento', 'Educação', 'Healthtech'],
      recommendedActions: ['Atualizar inventário de IA.'],
    }),
  },
  {
    id: 'edpb-ai-gdpr-transparency',
    title: 'IA e RGPD: transparência e base legal continuam centrais para uso corporativo de modelos',
    category: 'RGPD / Dados pessoais',
    jurisdiction: 'União Europeia',
    publishedAt: '2026-06-08',
    source: 'EDPB / autoridades europeias de proteção de dados',
    sourceType: 'Regulador',
    author: 'RISCK COMPLY Intelligence Desk',
    reliability: 'Alta',
    impact: 'Médio',
    executiveSummary: 'Empresas que usam IA com dados pessoais precisam demonstrar finalidade, minimização, transparência, controle de acesso, retenção e base legal adequada.',
    risckComplyAnalysis: 'O cliente deve revisar política de uso aceitável de IA, DPIA quando houver alto risco e fornecedores que processam dados fora da empresa.',
    affectedCompanies: ['E-commerce', 'SaaS com suporte ao cliente', 'Consultorias', 'Empresas com CRM'],
    recommendedActions: ['Revisar política interna de IA.', 'Adicionar fornecedores de IA ao registro de terceiros.', 'Criar evidência de base legal.', 'Treinar equipes que usam prompts.'],
    calendarSuggestion: 'Criar revisão de política de IA generativa e RGPD em 45 dias.',
    premium: false,
    persona: getPersonaByCategory('RGPD / Dados pessoais'),
    newspaperDeck: 'O uso corporativo de IA com dados pessoais exige explicação, base legal e controle. A pressão agora é transformar política em evidência.',
    articleParagraphs: buildArticleParagraphs({
      title: 'IA e RGPD: transparência e base legal continuam centrais para uso corporativo de modelos',
      category: 'RGPD / Dados pessoais',
      jurisdiction: 'União Europeia',
      source: 'EDPB / autoridades europeias de proteção de dados',
      executiveSummary: 'Empresas que usam IA com dados pessoais precisam demonstrar finalidade, minimização, transparência, controle de acesso, retenção e base legal adequada.',
      risckComplyAnalysis: 'O cliente deve revisar política de uso aceitável de IA, DPIA quando houver alto risco e fornecedores que processam dados fora da empresa.',
      affectedCompanies: ['E-commerce', 'SaaS com suporte ao cliente', 'Consultorias', 'Empresas com CRM'],
      recommendedActions: ['Revisar política interna de IA.'],
    }),
  },
  {
    id: 'nis2-dora-technology-governance',
    title: 'Governança tecnológica: NIS2 e DORA elevam pressão sobre risco de terceiros e incidentes',
    category: 'Cibersegurança / Terceiros',
    jurisdiction: 'União Europeia',
    publishedAt: '2026-06-05',
    source: 'ENISA / autoridades nacionais competentes',
    sourceType: 'Fonte oficial',
    author: 'RISCK COMPLY Intelligence Desk',
    reliability: 'Alta',
    impact: 'Alto',
    executiveSummary: 'Empresas reguladas e fornecedores críticos precisam mostrar rastreabilidade de incidentes, continuidade operacional, fornecedores essenciais e evidências de resposta.',
    risckComplyAnalysis: 'A notícia deve acionar revisão de vendors críticos, SLAs, DPA, incident response e continuidade. O calendário inteligente deve sugerir revisão periódica.',
    affectedCompanies: ['Fintech', 'SaaS corporativo', 'Cloud providers', 'Empresas com fornecedores críticos'],
    recommendedActions: ['Marcar fornecedores críticos.', 'Validar plano de continuidade.', 'Testar resposta a incidentes.', 'Atualizar subprocessadores.'],
    calendarSuggestion: 'Criar revisão de terceiros críticos e continuidade operacional em 30 dias.',
    premium: true,
    persona: getPersonaByCategory('business vendor risk'),
    newspaperDeck: 'Resiliência e terceiros viraram assunto de diretoria. O risco agora mora em contratos, fornecedores e capacidade de provar resposta.',
    articleParagraphs: buildArticleParagraphs({
      title: 'Governança tecnológica: NIS2 e DORA elevam pressão sobre risco de terceiros e incidentes',
      category: 'Cibersegurança / Terceiros',
      jurisdiction: 'União Europeia',
      source: 'ENISA / autoridades nacionais competentes',
      executiveSummary: 'Empresas reguladas e fornecedores críticos precisam mostrar rastreabilidade de incidentes, continuidade operacional, fornecedores essenciais e evidências de resposta.',
      risckComplyAnalysis: 'A notícia deve acionar revisão de vendors críticos, SLAs, DPA, incident response e continuidade. O calendário inteligente deve sugerir revisão periódica.',
      affectedCompanies: ['Fintech', 'SaaS corporativo', 'Cloud providers', 'Empresas com fornecedores críticos'],
      recommendedActions: ['Marcar fornecedores críticos.'],
    }),
  },
];

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

function mapDatabaseItem(item: IntelligenceDatabaseRow): IntelligenceItem {
  const base = {
    id: item.external_id ?? item.id,
    title: item.title,
    category: item.category,
    jurisdiction: item.jurisdiction,
    publishedAt: item.published_at ?? new Date().toISOString(),
    source: item.source_name,
    sourceType: mapSourceType(item.source_type),
    author: item.author ?? 'RISCK COMPLY Intelligence Desk',
    reliability: mapReliability(item.reliability),
    impact: mapImpact(item.impact),
    executiveSummary: item.executive_summary,
    risckComplyAnalysis: item.internal_analysis,
    affectedCompanies: normalizeStringArray(item.affected_companies),
    recommendedActions: normalizeStringArray(item.recommended_actions),
    calendarSuggestion: item.impact === 'high' || item.impact === 'critical' ? 'Criar revisão no calendário inteligente em até 30 dias.' : 'Monitorar e criar tarefa se houver impacto direto na empresa.',
    premium: Boolean(item.premium),
    persona: getPersonaByCategory(item.category),
  };

  return {
    ...base,
    newspaperDeck: buildNewspaperDeck(base.executiveSummary),
    articleParagraphs: buildArticleParagraphs(base),
  };
}

const intelligenceSelect = 'id,external_id,title,category,jurisdiction,published_at,source_name,source_type,author,reliability,impact,executive_summary,internal_analysis,affected_companies,recommended_actions,premium';

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
    .order('published_at', { ascending: false })
    .limit(50);

  if (error) throw intelligenceReadError('list_published', error.code);
  if (!data?.length) return fallbackIntelligenceItems;
  return (data as IntelligenceDatabaseRow[]).map((item) => mapDatabaseItem(item));
}

export async function getPublishedIntelligenceItem(id: string): Promise<IntelligenceItem | null> {
  const fallback = fallbackIntelligenceItems.find((item) => item.id === id);
  const supabase = createAdminClient();

  const { data: externalMatch, error: externalError } = await supabase
    .from('intelligence_items')
    .select(intelligenceSelect)
    .eq('status', 'published')
    .eq('external_id', id)
    .maybeSingle();

  if (externalError) throw intelligenceReadError('get_published_external_id', externalError.code);
  if (externalMatch) return mapDatabaseItem(externalMatch as IntelligenceDatabaseRow);
  if (!isUuid(id)) return fallback ?? null;

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
