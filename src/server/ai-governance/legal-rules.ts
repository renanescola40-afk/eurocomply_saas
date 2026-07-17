export const AI_ACT_LEGAL_ROLES = [
  'provider',
  'deployer',
  'importer',
  'distributor',
  'authorised_representative',
  'product_manufacturer',
  'gpai_provider',
  'downstream_provider',
  'public_authority',
  'private_public_service_provider',
] as const;

export type AiActLegalRole = (typeof AI_ACT_LEGAL_ROLES)[number];

export const AI_ACT_RULE_CATEGORIES = [
  'ai_literacy',
  'prohibited_practice',
  'gpai',
  'transparency',
  'high_risk_standalone',
  'high_risk_product',
] as const;

export type AiActRuleCategory = (typeof AI_ACT_RULE_CATEGORIES)[number];
export type AiActRuleStatus = 'active' | 'transitional' | 'superseded' | 'draft_guidance';
export type AiActSourceAuthority = 'eur_lex' | 'european_commission' | 'council_of_eu';

export type AiActOfficialSource = {
  authority: AiActSourceAuthority;
  title: string;
  url: string;
  publishedAt: string;
  verifiedAt: string;
};

export type AiActLegalRule = {
  id: string;
  regulation: 'Regulation (EU) 2024/1689';
  article: string;
  paragraph?: string;
  annex?: string;
  category: AiActRuleCategory;
  title: string;
  obligation: string;
  applicableRoles: AiActLegalRole[];
  appliesFrom: string;
  transitionEndsAt?: string;
  exceptions: string[];
  jurisdiction: 'EU';
  source: AiActOfficialSource;
  version: string;
  status: AiActRuleStatus;
  reviewBy: string;
  supersededBy?: string;
  legalReviewRequired: boolean;
};

const EUR_LEX_AI_ACT_URL = 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj?locale=en';
const COMMISSION_AI_ACT_URL = 'https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai';
const COMMISSION_TRANSPARENCY_CODE_URL = 'https://digital-strategy.ec.europa.eu/en/faqs/code-practice-transparency-ai-generated-content';
const COUNCIL_AI_ACT_TIMELINE_URL = 'https://www.consilium.europa.eu/en/policies/artificial-intelligence-act/timeline-artificial-intelligence/';

export const AI_ACT_LEGAL_RULES: AiActLegalRule[] = [
  {
    id: 'eu-ai-act-art4-ai-literacy',
    regulation: 'Regulation (EU) 2024/1689',
    article: 'Article 4',
    category: 'ai_literacy',
    title: 'AI literacy measures',
    obligation: 'Take measures, to the best extent, to ensure a sufficient level of AI literacy for staff and other persons operating or using AI systems on the organisation’s behalf.',
    applicableRoles: ['provider', 'deployer'],
    appliesFrom: '2025-02-02',
    exceptions: [],
    jurisdiction: 'EU',
    source: {
      authority: 'eur_lex',
      title: 'Regulation (EU) 2024/1689 — Article 4',
      url: EUR_LEX_AI_ACT_URL,
      publishedAt: '2024-07-12',
      verifiedAt: '2026-07-17',
    },
    version: '2026-07-17.1',
    status: 'active',
    reviewBy: '2026-10-17',
    legalReviewRequired: false,
  },
  {
    id: 'eu-ai-act-art5-prohibited-practices',
    regulation: 'Regulation (EU) 2024/1689',
    article: 'Article 5',
    category: 'prohibited_practice',
    title: 'Prohibited AI practices',
    obligation: 'Do not place on the market, put into service or use AI systems that fall within a prohibited practice, subject to the precise conditions and exceptions in Article 5 and later amendments.',
    applicableRoles: ['provider', 'deployer', 'importer', 'distributor', 'product_manufacturer'],
    appliesFrom: '2025-02-02',
    exceptions: ['Article-specific exceptions must be assessed and documented before a system is treated as permitted.'],
    jurisdiction: 'EU',
    source: {
      authority: 'eur_lex',
      title: 'Regulation (EU) 2024/1689 — Article 5',
      url: EUR_LEX_AI_ACT_URL,
      publishedAt: '2024-07-12',
      verifiedAt: '2026-07-17',
    },
    version: '2026-07-17.1',
    status: 'active',
    reviewBy: '2026-08-17',
    legalReviewRequired: true,
  },
  {
    id: 'eu-ai-act-art5-intimate-content-amendment',
    regulation: 'Regulation (EU) 2024/1689',
    article: 'Article 5 amendment',
    category: 'prohibited_practice',
    title: 'Prohibition covering non-consensual intimate content and child sexual abuse material',
    obligation: 'Treat AI practices involving generation of non-consensual sexual or intimate content or child sexual abuse material as prohibited under the 2026 Digital Omnibus amendment.',
    applicableRoles: ['provider', 'deployer', 'importer', 'distributor', 'product_manufacturer'],
    appliesFrom: '2026-06-29',
    exceptions: ['Confirm the final published amending regulation and any transitional wording before enforcement decisions.'],
    jurisdiction: 'EU',
    source: {
      authority: 'council_of_eu',
      title: 'Council gives final green light to simplify and streamline AI rules',
      url: COUNCIL_AI_ACT_TIMELINE_URL,
      publishedAt: '2026-06-29',
      verifiedAt: '2026-07-17',
    },
    version: '2026-07-17.1',
    status: 'active',
    reviewBy: '2026-08-17',
    legalReviewRequired: true,
  },
  {
    id: 'eu-ai-act-gpai-obligations',
    regulation: 'Regulation (EU) 2024/1689',
    article: 'Articles 53–55',
    category: 'gpai',
    title: 'General-purpose AI model obligations',
    obligation: 'Apply the applicable documentation, downstream information, copyright, training-content-summary and systemic-risk controls to providers of general-purpose AI models.',
    applicableRoles: ['gpai_provider'],
    appliesFrom: '2025-08-02',
    exceptions: ['Open-source exceptions and systemic-risk thresholds must be assessed against the applicable article and guidance.'],
    jurisdiction: 'EU',
    source: {
      authority: 'european_commission',
      title: 'AI Act application timeline and GPAI obligations',
      url: COMMISSION_AI_ACT_URL,
      publishedAt: '2024-08-01',
      verifiedAt: '2026-07-17',
    },
    version: '2026-07-17.1',
    status: 'active',
    reviewBy: '2026-10-17',
    legalReviewRequired: true,
  },
  {
    id: 'eu-ai-act-art50-general-transparency',
    regulation: 'Regulation (EU) 2024/1689',
    article: 'Article 50',
    category: 'transparency',
    title: 'General transparency obligations',
    obligation: 'Implement the applicable disclosure, information, labelling and machine-readable marking controls for interactive, emotion-recognition, biometric-categorisation and generative AI systems.',
    applicableRoles: ['provider', 'deployer'],
    appliesFrom: '2026-08-02',
    exceptions: ['Article 50 contains role-specific scope and exceptions that must be evaluated for each system and content type.'],
    jurisdiction: 'EU',
    source: {
      authority: 'european_commission',
      title: 'AI Act transparency obligations',
      url: COMMISSION_AI_ACT_URL,
      publishedAt: '2024-08-01',
      verifiedAt: '2026-07-17',
    },
    version: '2026-07-17.1',
    status: 'active',
    reviewBy: '2026-08-17',
    legalReviewRequired: true,
  },
  {
    id: 'eu-ai-act-art50-preexisting-synthetic-transition',
    regulation: 'Regulation (EU) 2024/1689',
    article: 'Article 50(2) and 50(4)',
    category: 'transparency',
    title: 'Transition for pre-existing synthetic-content systems',
    obligation: 'For qualifying systems placed on the market before 2 August 2026, track the transitional deadline for Article 50 synthetic-content transparency controls.',
    applicableRoles: ['provider', 'deployer'],
    appliesFrom: '2026-08-02',
    transitionEndsAt: '2026-12-02',
    exceptions: ['Only systems that meet the official pre-existing-system transition conditions qualify.'],
    jurisdiction: 'EU',
    source: {
      authority: 'european_commission',
      title: 'Code of Practice on Transparency of AI-Generated Content — transition period',
      url: COMMISSION_TRANSPARENCY_CODE_URL,
      publishedAt: '2026-06-10',
      verifiedAt: '2026-07-17',
    },
    version: '2026-07-17.1',
    status: 'transitional',
    reviewBy: '2026-08-17',
    legalReviewRequired: true,
  },
  {
    id: 'eu-ai-act-high-risk-standalone-2027',
    regulation: 'Regulation (EU) 2024/1689',
    article: 'High-risk system provisions',
    annex: 'Annex III and related provisions',
    category: 'high_risk_standalone',
    title: 'Standalone high-risk AI system rules',
    obligation: 'Prepare the applicable high-risk provider and deployer controls for standalone systems in listed high-risk areas.',
    applicableRoles: ['provider', 'deployer', 'importer', 'distributor', 'authorised_representative'],
    appliesFrom: '2027-12-02',
    exceptions: ['High-risk classification exceptions and role-specific duties must be evaluated per system.'],
    jurisdiction: 'EU',
    source: {
      authority: 'council_of_eu',
      title: 'Digital Omnibus on AI — fixed high-risk implementation timeline',
      url: COUNCIL_AI_ACT_TIMELINE_URL,
      publishedAt: '2026-06-29',
      verifiedAt: '2026-07-17',
    },
    version: '2026-07-17.1',
    status: 'active',
    reviewBy: '2026-10-17',
    legalReviewRequired: true,
  },
  {
    id: 'eu-ai-act-high-risk-product-2028',
    regulation: 'Regulation (EU) 2024/1689',
    article: 'High-risk system provisions',
    annex: 'Annex I / regulated products',
    category: 'high_risk_product',
    title: 'High-risk AI systems embedded in regulated products',
    obligation: 'Prepare the applicable high-risk controls and product-law coordination for AI systems embedded in regulated products.',
    applicableRoles: ['provider', 'deployer', 'importer', 'distributor', 'authorised_representative', 'product_manufacturer'],
    appliesFrom: '2028-08-02',
    exceptions: ['Product-sector legislation and conformity-assessment routes must be evaluated together with the AI Act.'],
    jurisdiction: 'EU',
    source: {
      authority: 'council_of_eu',
      title: 'Digital Omnibus on AI — fixed high-risk implementation timeline',
      url: COUNCIL_AI_ACT_TIMELINE_URL,
      publishedAt: '2026-06-29',
      verifiedAt: '2026-07-17',
    },
    version: '2026-07-17.1',
    status: 'active',
    reviewBy: '2026-10-17',
    legalReviewRequired: true,
  },
];

const OFFICIAL_SOURCE_HOSTS = new Set([
  'eur-lex.europa.eu',
  'digital-strategy.ec.europa.eu',
  'www.consilium.europa.eu',
]);

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));
}

export type AiActLegalRuleValidationIssue = {
  ruleId: string;
  field: string;
  message: string;
};

export function validateAiActLegalRules(rules: AiActLegalRule[] = AI_ACT_LEGAL_RULES): AiActLegalRuleValidationIssue[] {
  const issues: AiActLegalRuleValidationIssue[] = [];
  const ids = new Set<string>();
  const ruleIds = new Set(rules.map((rule) => rule.id));

  for (const rule of rules) {
    if (ids.has(rule.id)) {
      issues.push({ ruleId: rule.id, field: 'id', message: 'Rule id must be unique.' });
    }
    ids.add(rule.id);

    if (!rule.article.trim()) {
      issues.push({ ruleId: rule.id, field: 'article', message: 'Article reference is required.' });
    }

    for (const [field, value] of [
      ['appliesFrom', rule.appliesFrom],
      ['reviewBy', rule.reviewBy],
      ['publishedAt', rule.source.publishedAt],
      ['verifiedAt', rule.source.verifiedAt],
    ] as const) {
      if (!isIsoDate(value)) {
        issues.push({ ruleId: rule.id, field, message: 'Expected a valid ISO date (YYYY-MM-DD).' });
      }
    }

    if (rule.transitionEndsAt && !isIsoDate(rule.transitionEndsAt)) {
      issues.push({ ruleId: rule.id, field: 'transitionEndsAt', message: 'Expected a valid ISO date (YYYY-MM-DD).' });
    }

    if (isIsoDate(rule.reviewBy) && isIsoDate(rule.source.verifiedAt) && rule.reviewBy < rule.source.verifiedAt) {
      issues.push({ ruleId: rule.id, field: 'reviewBy', message: 'Review date cannot precede the verification date.' });
    }

    try {
      const host = new URL(rule.source.url).hostname;
      if (!OFFICIAL_SOURCE_HOSTS.has(host)) {
        issues.push({ ruleId: rule.id, field: 'source.url', message: 'Source must use an approved official EU host.' });
      }
    } catch {
      issues.push({ ruleId: rule.id, field: 'source.url', message: 'Source URL is invalid.' });
    }

    if (rule.applicableRoles.length === 0) {
      issues.push({ ruleId: rule.id, field: 'applicableRoles', message: 'At least one applicable role is required.' });
    }

    if (rule.status === 'superseded' && !rule.supersededBy) {
      issues.push({ ruleId: rule.id, field: 'supersededBy', message: 'Superseded rules must identify their replacement.' });
    }

    if (rule.supersededBy && !ruleIds.has(rule.supersededBy)) {
      issues.push({ ruleId: rule.id, field: 'supersededBy', message: 'Replacement rule does not exist in the registry.' });
    }
  }

  return issues;
}

export function getAiActRule(ruleId: string, rules: AiActLegalRule[] = AI_ACT_LEGAL_RULES) {
  return rules.find((rule) => rule.id === ruleId) ?? null;
}

export function listApplicableAiActRules(input: {
  roles: AiActLegalRole[];
  categories?: AiActRuleCategory[];
  onDate?: string;
  includeFuture?: boolean;
  rules?: AiActLegalRule[];
}) {
  const rules = input.rules ?? AI_ACT_LEGAL_RULES;
  const onDate = input.onDate ?? new Date().toISOString().slice(0, 10);
  const roleSet = new Set(input.roles);
  const categorySet = input.categories ? new Set(input.categories) : null;

  return rules.filter((rule) => {
    if (rule.status === 'superseded' || rule.status === 'draft_guidance') return false;
    if (!rule.applicableRoles.some((role) => roleSet.has(role))) return false;
    if (categorySet && !categorySet.has(rule.category)) return false;
    if (!input.includeFuture && rule.appliesFrom > onDate) return false;
    return true;
  });
}
