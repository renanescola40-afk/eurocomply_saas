export type IntelligenceSourceRights = 'official_full_text_allowed' | 'metadata_summary_analysis_only' | 'licensed_full_text_allowed';
export type IntelligenceRegion = 'Global' | 'European Union' | 'United States' | 'China' | 'Brazil' | 'United Kingdom' | 'Asia-Pacific' | 'Latin America';

export type IntelligenceSourceRegistryItem = {
  id: string;
  name: string;
  region: IntelligenceRegion;
  category: 'official' | 'regulator' | 'technology_press' | 'business_press' | 'research' | 'company_blog';
  rights: IntelligenceSourceRights;
  usePolicy: string;
};

export const GLOBAL_INTELLIGENCE_SOURCES: IntelligenceSourceRegistryItem[] = [
  {
    id: 'european-commission',
    name: 'European Commission',
    region: 'European Union',
    category: 'official',
    rights: 'official_full_text_allowed',
    usePolicy: 'Pode alimentar dossiês oficiais com referência, resumo, análise e conteúdo permitido quando a licença permitir.',
  },
  {
    id: 'edpb',
    name: 'European Data Protection Board',
    region: 'European Union',
    category: 'regulator',
    rights: 'official_full_text_allowed',
    usePolicy: 'Usar como fonte primária para privacidade, RGPD e orientações de autoridades.',
  },
  {
    id: 'enisa',
    name: 'ENISA',
    region: 'European Union',
    category: 'regulator',
    rights: 'official_full_text_allowed',
    usePolicy: 'Usar para cibersegurança, NIS2, incidentes, resiliência e risco tecnológico.',
  },
  {
    id: 'nist',
    name: 'NIST',
    region: 'United States',
    category: 'official',
    rights: 'official_full_text_allowed',
    usePolicy: 'Usar como referência técnica para IA, segurança, controles e gestão de risco.',
  },
  {
    id: 'white-house',
    name: 'The White House / US Government',
    region: 'United States',
    category: 'official',
    rights: 'official_full_text_allowed',
    usePolicy: 'Usar para política pública, ordens executivas, IA, chips e estratégia digital.',
  },
  {
    id: 'gov-br',
    name: 'Governo do Brasil',
    region: 'Brazil',
    category: 'official',
    rights: 'official_full_text_allowed',
    usePolicy: 'Usar para regulação brasileira, IA, dados, tecnologia, LGPD e política digital.',
  },
  {
    id: 'cac-china',
    name: 'Cyberspace Administration of China',
    region: 'China',
    category: 'regulator',
    rights: 'official_full_text_allowed',
    usePolicy: 'Usar para governança digital chinesa, IA generativa, dados, plataformas e soberania.',
  },
  {
    id: 'technology-media',
    name: 'Technology media sources',
    region: 'Global',
    category: 'technology_press',
    rights: 'metadata_summary_analysis_only',
    usePolicy: 'Nunca copiar matéria integral. Guardar título, autor, data, link, curto resumo factual e análise editorial própria.',
  },
  {
    id: 'business-media',
    name: 'Business media sources',
    region: 'Global',
    category: 'business_press',
    rights: 'metadata_summary_analysis_only',
    usePolicy: 'Nunca substituir paywall ou republicar texto. Produzir síntese própria com referência e impacto para empresas.',
  },
  {
    id: 'company-research-blogs',
    name: 'Company research and engineering blogs',
    region: 'Global',
    category: 'company_blog',
    rights: 'metadata_summary_analysis_only',
    usePolicy: 'Usar anúncios e posts técnicos como sinais; publicar análise própria, não cópia de conteúdo.',
  },
];
