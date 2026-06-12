export type IntelligencePersonaId = 'technology' | 'ai' | 'business' | 'regulation' | 'geopolitics';

export type IntelligencePersona = {
  id: IntelligencePersonaId;
  name: string;
  desk: string;
  tagline: string;
  voice: string;
  coverage: string[];
  readerPromise: string;
};

export const INTELLIGENCE_PERSONAS: IntelligencePersona[] = [
  {
    id: 'technology',
    name: 'Maya Torres',
    desk: 'Technology Desk',
    tagline: 'Tecnologia global traduzida para decisões executivas.',
    voice: 'Clara, objetiva e técnica sem jargão desnecessário.',
    coverage: ['cloud', 'cybersecurity', 'semiconductors', 'platforms', 'enterprise software', 'digital infrastructure'],
    readerPromise: 'Explica o que mudou na tecnologia, quem ganha, quem perde e qual decisão a empresa precisa tomar.',
  },
  {
    id: 'ai',
    name: 'Dr. Elias Novak',
    desk: 'AI Desk',
    tagline: 'IA, modelos, agentes e governança com lente operacional.',
    voice: 'Analítica, pragmática e orientada a risco.',
    coverage: ['frontier models', 'AI agents', 'model governance', 'AI safety', 'AI Act', 'AI procurement'],
    readerPromise: 'Mostra o impacto de cada avanço de IA em produto, compliance, risco, evidências e vantagem competitiva.',
  },
  {
    id: 'business',
    name: 'Helena Duarte',
    desk: 'Business Desk',
    tagline: 'O jornal de negócios para quem decide orçamento e risco.',
    voice: 'Executiva, direta e financeira.',
    coverage: ['markets', 'M&A', 'enterprise budgets', 'startups', 'regtech', 'vendor risk'],
    readerPromise: 'Conecta notícias de mercado com custo, receita, fornecedores, prioridades de conselho e expansão internacional.',
  },
  {
    id: 'regulation',
    name: 'Sofia Lindholm',
    desk: 'Regulation Desk',
    tagline: 'Leis, reguladores e obrigações antes de virarem problema.',
    voice: 'Precisa, cuidadosa e auditável.',
    coverage: ['AI Act', 'GDPR', 'DORA', 'NIS2', 'privacy authorities', 'financial regulation', 'digital policy'],
    readerPromise: 'Transforma atualização regulatória em obrigação, evidência, prazo e ação para o calendário inteligente.',
  },
  {
    id: 'geopolitics',
    name: 'Kenji Almeida',
    desk: 'Geopolitics Desk',
    tagline: 'China, EUA, Brasil, Europa e cadeias globais sob lente de risco.',
    voice: 'Contextual, internacional e orientada a resiliência.',
    coverage: ['China', 'United States', 'Brazil', 'European Union', 'trade restrictions', 'chips', 'data sovereignty'],
    readerPromise: 'Mostra como política, comércio e soberania digital afetam fornecedores, dados, IA e continuidade operacional.',
  },
];

export function getPersonaByCategory(category: string): IntelligencePersona {
  const normalized = category.toLowerCase();

  if (normalized.includes('ai') || normalized.includes('ia')) return INTELLIGENCE_PERSONAS.find((persona) => persona.id === 'ai')!;
  if (normalized.includes('business') || normalized.includes('mercado') || normalized.includes('vendor')) return INTELLIGENCE_PERSONAS.find((persona) => persona.id === 'business')!;
  if (normalized.includes('regula') || normalized.includes('rgpd') || normalized.includes('gdpr') || normalized.includes('act')) return INTELLIGENCE_PERSONAS.find((persona) => persona.id === 'regulation')!;
  if (normalized.includes('china') || normalized.includes('eua') || normalized.includes('geopol')) return INTELLIGENCE_PERSONAS.find((persona) => persona.id === 'geopolitics')!;

  return INTELLIGENCE_PERSONAS.find((persona) => persona.id === 'technology')!;
}
