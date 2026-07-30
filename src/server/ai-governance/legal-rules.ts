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
export type AiActRuleStatus =
  | 'active'
  | 'transitional'
  | 'adopted_pending_effect'
  | 'superseded'
  | 'draft_guidance';
export type AiActApplicationDateStatus = 'confirmed' | 'pending_official_publication';
export type AiActSourceAuthority = 'eur_lex' | 'european_commission' | 'council_of_eu';
export type AiActSourceRegulation = 'Regulation (EU) 2024/1689' | 'Regulation (EU) 2026/1744';

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
  sourceRegulation: AiActSourceRegulation;
  article: string;
  paragraph?: string;
  annex?: string;
  category: AiActRuleCategory;
  title: string;
  obligation: string;
  applicableRoles: AiActLegalRole[];
  appliesFrom: string | null;
  applicationDateStatus: AiActApplicationDateStatus;
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

export const AI_ACT_LEGAL_RULES_VERSION = '2026-07-30.1';
export const AI_ACT_LEGAL_SOURCE_REGULATIONS: AiActSourceRegulation[] = [
  'Regulation (EU) 2024/1689',
  'Regulation (EU) 2026/1744',
];

const EUR_LEX_AI_ACT_URL = 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj?locale=en';
const EUR_LEX_AI_OMNIBUS_URL = 'https://eur-lex.europa.eu/eli/reg/2026/1744/oj?locale=en';
const COMMISSION_AI_ACT_URL = 'https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai';

export const AI_ACT_LEGAL_RULES: AiActLegalRule[] = [
  {
    id: 'eu-ai-act-art4-ai-literacy',
    regulation: 'Regulation (EU) 2024/1689',
    sourceRegulation: 'Regulation (EU) 2024/1689',
    article: 'Article 4',
    category: 'ai_literacy',
    title: 'AI literacy measures',
    obligation: 'Take measures, to the best extent, to ensure a sufficient level of AI literacy for staff and other persons operating or using AI systems on the organisation’s behalf.',
    applicableRoles: ['provider', 'deployer'],
    appliesFrom: '2025-02-02',
    applicationDateStatus: 'confirmed',
    exceptions: [],
    jurisdiction: 'EU',
    source: {
      authority: 'eur_lex',
      title: 'Regulation (EU) 2024/1689 — Article 4',
      url: EUR_LEX_AI_ACT_URL,
      publishedAt: '2024-07-12',
      verifiedAt: '2026-07-30',
    },
    version: AI_ACT_LEGAL_RULES_VERSION,
    status: 'active',
    reviewBy: '2026-10-30',
    legalReviewRequired: false,
  },
  {
    id: 'eu-ai-act-art5-prohibited-practices',
    regulation: 'Regulation (EU) 2024/1689',
    sourceRegulation: 'Regulation (EU) 2024/1689',
    article: 'Article 5',
    category: 'prohibited_practice',
    title: 'Prohibited AI practices',
    obligation: 'Do not place on the market, put into service or use AI systems that fall within a prohibited practice, subject to the precise conditions and exceptions in Article 5 and later amendments.',
    applicableRoles: ['provider', 'deployer', 'importer', 'distributor', 'product_manufacturer'],
    appliesFrom: '2025-02-02',
    applicationDateStatus: 'confirmed',
    exceptions: ['Article-specific exceptions must be assessed and documented before a system is treated as permitted.'],
    jurisdiction: 'EU',
    source: {
      authority: 'eur_lex',
      title: 'Regulation (EU) 2024/1689 — Article 5',
      url: EUR_LEX_AI_ACT_URL,
      publishedAt: '2024-07-12',
      verifiedAt: '2026-07-30',
    },
    version: AI_ACT_LEGAL_RULES_VERSION,
    status: 'active',
    reviewBy: '2026-08-30',
    legalReviewRequired: true,
  },
  {
    id: 'eu-ai-act-art5-intimate-content-amendment',
    regulation: 'Regulation (EU) 2024/1689',
    sourceRegulation: 'Regulation (EU) 2026/1744',
    article: 'Article 5(1), first subparagraph, points (ba) and (bb), and Article 5(1a) and (1b)',
    category: 'prohibited_practice',
    title: 'Prohibitions covering non-consensual intimate material and child sexual abuse material',
    obligation: 'Block the placing on the market, putting into service or prohibited use of AI systems that generate or manipulate non-consensual intimate material or child sexual abuse material when the statutory conditions are met.',
    applicableRoles: ['provider', 'deployer', 'importer', 'distributor', 'product_manufacturer'],
    appliesFrom: '2026-12-02',
    applicationDateStatus: 'confirmed',
    exceptions: ['Apply the intended-purpose, reasonably-foreseeable-outcome, safeguard, deployer-purpose, consent, manipulation and “without right” conditions in Article 5(1a) and (1b); preserve qualified legal review for borderline facts.'],
    jurisdiction: 'EU',
    source: {
      authority: 'eur_lex',
      title: 'Regulation (EU) 2026/1744 — amendment of Article 5',
      url: EUR_LEX_AI_OMNIBUS_URL,
      publishedAt: '2026-07-24',
      verifiedAt: '2026-07-30',
    },
    version: AI_ACT_LEGAL_RULES_VERSION,
    status: 'active',
    reviewBy: '2026-08-30',
    legalReviewRequired: true,
  },
  {
    id: 'eu-ai-act-gpai-obligations',
    regulation: 'Regulation (EU) 2024/1689',
    sourceRegulation: 'Regulation (EU) 2024/1689',
    article: 'Articles 53–55',
    category: 'gpai',
    title: 'General-purpose AI model obligations',
    obligation: 'Apply the applicable documentation, downstream information, copyright, training-content-summary and systemic-risk controls to providers of general-purpose AI models.',
    applicableRoles: ['gpai_provider'],
    appliesFrom: '2025-08-02',
    applicationDateStatus: 'confirmed',
    exceptions: ['Open-source exceptions and systemic-risk thresholds must be assessed against the applicable article and guidance.'],
    jurisdiction: 'EU',
    source: {
      authority: 'european_commission',
      title: 'AI Act application timeline and GPAI obligations',
      url: COMMISSION_AI_ACT_URL,
      publishedAt: '2024-08-01',
      verifiedAt: '2026-07-30',
    },
    version: AI_ACT_LEGAL_RULES_VERSION,
    status: 'active',
    reviewBy: '2026-10-30',
    legalReviewRequired: true,
  },
  {
    id: 'eu-ai-act-art50-general-transparency',
    regulation: 'Regulation (EU) 2024/1689',
    sourceRegulation: 'Regulation (EU) 2024/1689',
    article: 'Article 50',
    category: 'transparency',
    title: 'General transparency obligations',
    obligation: 'Implement the applicable disclosure, information, labelling and machine-readable marking controls for interactive, emotion-recognition, biometric-categorisation and generative AI systems.',
    applicableRoles: ['provider', 'deployer'],
    appliesFrom: '2026-08-02',
    applicationDateStatus: 'confirmed',
    exceptions: ['Article 50 contains role-specific scope and exceptions that must be evaluated for each system and content type.'],
    jurisdiction: 'EU',
    source: {
      authority: 'eur_lex',
      title: 'Regulation (EU) 2024/1689 — Article 50',
      url: EUR_LEX_AI_ACT_URL,
      publishedAt: '2024-07-12',
      verifiedAt: '2026-07-30',
    },
    version: AI_ACT_LEGAL_RULES_VERSION,
    status: 'active',
    reviewBy: '2026-08-30',
    legalReviewRequired: true,
  },
  {
    id: 'eu-ai-act-art50-preexisting-synthetic-transition',
    regulation: 'Regulation (EU) 2024/1689',
    sourceRegulation: 'Regulation (EU) 2026/1744',
    article: 'Article 111(4) and Article 50(2)',
    category: 'transparency',
    title: 'Transition for pre-existing synthetic-content systems',
    obligation: 'For qualifying provider systems placed on the market before 2 August 2026, track the amended deadline to comply with Article 50(2).',
    applicableRoles: ['provider'],
    appliesFrom: '2026-08-02',
    applicationDateStatus: 'confirmed',
    transitionEndsAt: '2026-12-02',
    exceptions: ['This transition is limited to providers and Article 50(2); it must not be applied to deployer duties under Article 50(4).'],
    jurisdiction: 'EU',
    source: {
      authority: 'eur_lex',
      title: 'Regulation (EU) 2026/1744 — Article 111(4) transition amendment',
      url: EUR_LEX_AI_OMNIBUS_URL,
      publishedAt: '2026-07-24',
      verifiedAt: '2026-07-30',
    },
    version: AI_ACT_LEGAL_RULES_VERSION,
    status: 'transitional',
    reviewBy: '2026-08-30',
    legalReviewRequired: true,
  },
  {
    id: 'eu-ai-act-high-risk-standalone-2027',
    regulation: 'Regulation (EU) 2024/1689',
    sourceRegulation: 'Regulation (EU) 2026/1744',
    article: 'Article 113, third paragraph, point (c)(i)',
    annex: 'Annex III and Article 6(2)',
    category: 'high_risk_standalone',
    title: 'Standalone high-risk AI system rules',
    obligation: 'Prepare the applicable high-risk provider and deployer controls for standalone systems in listed high-risk areas.',
    applicableRoles: ['provider', 'deployer', 'importer', 'distributor', 'authorised_representative'],
    appliesFrom: '2027-12-02',
    applicationDateStatus: 'confirmed',
    exceptions: ['High-risk classification exceptions and role-specific duties must be evaluated per system.'],
    jurisdiction: 'EU',
    source: {
      authority: 'eur_lex',
      title: 'Regulation (EU) 2026/1744 — fixed Annex III implementation timeline',
      url: EUR_LEX_AI_OMNIBUS_URL,
      publishedAt: '2026-07-24',
      verifiedAt: '2026-07-30',
    },
    version: AI_ACT_LEGAL_RULES_VERSION,
    status: 'active',
    reviewBy: '2026-10-30',
    legalReviewRequired: true,
  },
  {
    id: 'eu-ai-act-high-risk-product-2028',
    regulation: 'Regulation (EU) 2024/1689',
    sourceRegulation: 'Regulation (EU) 2026/1744',
    article: 'Article 113, third paragraph, point (c)(ii)',
    annex: 'Annex I and Article 6(1)',
    category: 'high_risk_product',
    title: 'High-risk AI systems embedded in regulated products',
    obligation: 'Prepare the applicable high-risk controls and product-law coordination for AI systems embedded in regulated products.',
    applicableRoles: ['provider', 'deployer', 'importer', 'distributor', 'authorised_representative', 'product_manufacturer'],
    appliesFrom: '2028-08-02',
    applicationDateStatus: 'confirmed',
    exceptions: ['Product-sector legislation and conformity-assessment routes must be evaluated together with the AI Act.'],
    jurisdiction: 'EU',
    source: {
      authority: 'eur_lex',
      title: 'Regulation (EU) 2026/1744 — fixed Annex I implementation timeline',
      url: EUR_LEX_AI_OMNIBUS_URL,
      publishedAt: '2026-07-24',
      verifiedAt: '2026-07-30',
    },
    version: AI_ACT_LEGAL_RULES_VERSION,
    status: 'active',
    reviewBy: '2026-10-30',
    legalReviewRequired: true,
  },
];

const OFFICIAL_SOURCE_HOSTS = new Set([
  'eur-lex.europa.eu',
  'digital-strategy.ec.europa.eu',
  'www.consilium.europa.eu',
]);

function isIsoDate(value: string | null | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)));
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
      ['reviewBy', rule.reviewBy],
      ['publishedAt', rule.source.publishedAt],
      ['verifiedAt', rule.source.verifiedAt],
    ] as const) {
      if (!isIsoDate(value)) {
        issues.push({ ruleId: rule.id, field, message: 'Expected a valid ISO date (YYYY-MM-DD).' });
      }
    }

    if (rule.applicationDateStatus === 'confirmed' && !isIsoDate(rule.appliesFrom)) {
      issues.push({ ruleId: rule.id, field: 'appliesFrom', message: 'Confirmed rules require a valid application date.' });
    }

    if (rule.applicationDateStatus === 'pending_official_publication' && rule.appliesFrom !== null) {
      issues.push({ ruleId: rule.id, field: 'appliesFrom', message: 'Pending rules must not claim an application date.' });
    }

    if (rule.status === 'adopted_pending_effect' && rule.applicationDateStatus !== 'pending_official_publication') {
      issues.push({ ruleId: rule.id, field: 'applicationDateStatus', message: 'Pending-effect rules must await official publication.' });
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
      if (rule.sourceRegulation === 'Regulation (EU) 2026/1744' && !rule.source.url.includes('/2026/1744/')) {
        issues.push({ ruleId: rule.id, field: 'source.url', message: '2026/1744-derived rules must point to the Official Journal act.' });
      }
    } catch {
      issues.push({ ruleId: rule.id, field: 'source.url', message: 'Source URL is invalid.' });
    }

    if (rule.sourceRegulation === 'Regulation (EU) 2026/1744' && rule.source.publishedAt !== '2026-07-24') {
      issues.push({ ruleId: rule.id, field: 'source.publishedAt', message: 'Regulation (EU) 2026/1744 was published on 2026-07-24.' });
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
  includePending?: boolean;
  rules?: AiActLegalRule[];
}) {
  const rules = input.rules ?? AI_ACT_LEGAL_RULES;
  const onDate = input.onDate ?? new Date().toISOString().slice(0, 10);
  const roleSet = new Set(input.roles);
  const categorySet = input.categories ? new Set(input.categories) : null;

  return rules.filter((rule) => {
    if (rule.status === 'superseded' || rule.status === 'draft_guidance') return false;
    if (rule.status === 'adopted_pending_effect' && !input.includePending) return false;
    if (!rule.applicableRoles.some((role) => roleSet.has(role))) return false;
    if (categorySet && !categorySet.has(rule.category)) return false;
    if (rule.appliesFrom === null) return Boolean(input.includePending);
    if (!input.includeFuture && rule.appliesFrom > onDate) return false;
    return true;
  });
}
