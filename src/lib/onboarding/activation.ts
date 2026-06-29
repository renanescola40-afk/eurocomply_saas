import { z } from 'zod';

export const COUNTRY_CODES = ['pt', 'es', 'fr', 'de', 'it', 'nl', 'be', 'ie', 'se', 'dk', 'no', 'fi', 'pl', 'other_eu', 'uk', 'ch'] as const;
export const COMPANY_TYPES = ['startup', 'sme', 'scaleup', 'enterprise', 'agency', 'consultancy', 'public_sector', 'non_profit'] as const;
export const COMPANY_SECTORS = ['saas', 'fintech', 'hr_recruiting', 'healthcare', 'education', 'legal_compliance', 'ecommerce', 'marketing_agency', 'manufacturing', 'financial_services', 'public_services', 'other'] as const;
export const AI_USAGE_LEVELS = ['not_started', 'exploring', 'internal_productivity', 'customer_facing', 'automated_decisions', 'multiple_systems'] as const;
export const AI_SYSTEM_ROLES = ['provider', 'deployer', 'importer', 'distributor', 'other'] as const;
export const AI_SYSTEM_STATUSES = ['planned', 'pilot', 'production', 'retired'] as const;
export const AI_RISK_DOMAINS = ['general_productivity', 'customer_support', 'content_generation', 'biometrics', 'employment', 'education', 'credit_finance', 'essential_services', 'law_enforcement', 'migration_border', 'justice_democratic_processes', 'safety_component', 'critical_infrastructure'] as const;
export const PLAN_INTENTS = ['trial', 'essential', 'professional', 'business', 'enterprise'] as const;

export type CountryCode = (typeof COUNTRY_CODES)[number];
export type CompanyType = (typeof COMPANY_TYPES)[number];
export type CompanySector = (typeof COMPANY_SECTORS)[number];
export type AiUsageLevel = (typeof AI_USAGE_LEVELS)[number];
export type AiActRiskLevel = 'prohibited_review' | 'high_risk_review' | 'limited_transparency' | 'minimal_or_low';
export type PlanIntent = (typeof PLAN_INTENTS)[number];

export type OnboardingRecommendation = {
  id: string;
  title: string;
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
};

export type OnboardingTaskSuggestion = {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  dueInDays: number;
};

export type OnboardingActivationInitialState = {
  organization: {
    id: string;
    name: string;
    slug: string | null;
    country: string | null;
    companyType: string | null;
    sector: string | null;
    aiUsageSummary: string | null;
    onboardingStatus: 'not_started' | 'in_progress' | 'completed';
    onboardingStep: string | null;
    readinessScore: number | null;
    selectedPlan: string | null;
  } | null;
  firstAiSystem: {
    id: string;
    name: string | null;
    ownerTeam: string | null;
    vendorName: string | null;
    useCase: string | null;
    role: string | null;
    lifecycleStatus: string | null;
    riskDomain: string | null;
    riskLevel: AiActRiskLevel | null;
    usesPersonalData: boolean;
    interactsWithPeople: boolean;
    generatesContent: boolean;
    biometricIdentification: boolean;
    manipulativeOrExploitative: boolean;
  } | null;
  latestRun: {
    readinessScore: number | null;
    recommendedDocuments: OnboardingRecommendation[];
    suggestedTasks: OnboardingTaskSuggestion[];
    invitedEmails: string[];
    selectedPlan: string | null;
  } | null;
};

const slugPattern = new RegExp('^[a-z0-9-]+$');

export function slugifyOrganization(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export const inviteEmailsSchema = z.array(z.string().trim().toLowerCase().email()).max(10).default([]);

export const onboardingDraftSchema = z.object({
  organizationId: z.string().uuid().optional(),
  organizationName: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(3).max(80).regex(slugPattern),
  country: z.enum(COUNTRY_CODES).optional(),
  companyType: z.enum(COMPANY_TYPES).optional(),
  sector: z.enum(COMPANY_SECTORS).optional(),
  aiUsage: z.enum(AI_USAGE_LEVELS).optional(),
  aiUsageSummary: z.string().trim().max(1000).optional().default(''),
  onboardingStep: z.string().trim().max(80).optional().default('create-organization'),
  selectedPlan: z.enum(PLAN_INTENTS).optional().default('trial'),
});

export const onboardingActivationSchema = z.object({
  organizationId: z.string().uuid().optional(),
  organizationName: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(3).max(80).regex(slugPattern),
  country: z.enum(COUNTRY_CODES),
  companyType: z.enum(COMPANY_TYPES),
  sector: z.enum(COMPANY_SECTORS),
  aiUsage: z.enum(AI_USAGE_LEVELS),
  aiUsageSummary: z.string().trim().max(1000).optional().default(''),
  aiSystemId: z.string().uuid().optional(),
  aiSystemName: z.string().trim().min(2).max(160),
  aiSystemUseCase: z.string().trim().min(10).max(1600),
  ownerTeam: z.string().trim().min(2).max(160),
  vendorName: z.string().trim().max(160).optional().default(''),
  role: z.enum(AI_SYSTEM_ROLES).default('deployer'),
  lifecycleStatus: z.enum(AI_SYSTEM_STATUSES).default('pilot'),
  riskDomain: z.enum(AI_RISK_DOMAINS),
  usesPersonalData: z.boolean().default(false),
  interactsWithPeople: z.boolean().default(false),
  generatesContent: z.boolean().default(false),
  biometricIdentification: z.boolean().default(false),
  manipulativeOrExploitative: z.boolean().default(false),
  inviteEmails: inviteEmailsSchema,
  selectedPlan: z.enum(PLAN_INTENTS).default('trial'),
});

export type OnboardingDraftInput = z.infer<typeof onboardingDraftSchema>;
export type OnboardingActivationInput = z.infer<typeof onboardingActivationSchema>;

const highRiskDomains = new Set<string>([
  'biometrics',
  'employment',
  'education',
  'credit_finance',
  'essential_services',
  'law_enforcement',
  'migration_border',
  'justice_democratic_processes',
  'safety_component',
  'critical_infrastructure',
]);

export function inferInitialRiskLevel(input: {
  riskDomain: string;
  interactsWithPeople: boolean;
  generatesContent: boolean;
  biometricIdentification: boolean;
  manipulativeOrExploitative: boolean;
}): AiActRiskLevel {
  if (input.manipulativeOrExploitative) return 'prohibited_review';
  if (input.biometricIdentification || highRiskDomains.has(input.riskDomain)) return 'high_risk_review';
  if (input.interactsWithPeople || input.generatesContent) return 'limited_transparency';
  return 'minimal_or_low';
}

export function getRiskLevelLabel(level: AiActRiskLevel) {
  switch (level) {
    case 'prohibited_review':
      return 'Prohibited-practice review';
    case 'high_risk_review':
      return 'High-risk review';
    case 'limited_transparency':
      return 'Limited risk / transparency';
    case 'minimal_or_low':
      return 'Minimal or low risk';
  }
}

export function getRecommendedDocuments(input: {
  riskLevel: AiActRiskLevel;
  usesPersonalData: boolean;
  interactsWithPeople: boolean;
  generatesContent: boolean;
  sector: CompanySector | string;
}): OnboardingRecommendation[] {
  const docs: OnboardingRecommendation[] = [
    {
      id: 'ai-system-inventory',
      title: 'AI system inventory',
      category: 'governance',
      priority: 'high',
      reason: 'Every AI use case needs an owner, purpose, lifecycle status and organization_id trail.',
    },
    {
      id: 'employee-ai-use-policy',
      title: 'Employee AI usage policy',
      category: 'policy',
      priority: 'medium',
      reason: 'Staff need clear rules for approved tools, data handling and escalation.',
    },
    {
      id: 'ai-governance-summary',
      title: 'AI governance board summary',
      category: 'reporting',
      priority: 'medium',
      reason: 'Leadership should see readiness, open gaps and ownership from day one.',
    },
  ];

  if (input.usesPersonalData) {
    docs.push({
      id: 'personal-data-ai-dpia-screening',
      title: 'AI personal data DPIA screening',
      category: 'privacy',
      priority: 'high',
      reason: 'Personal data use should be checked against GDPR lawful basis, minimisation and DPIA triggers.',
    });
  }

  if (input.interactsWithPeople || input.generatesContent || input.riskLevel === 'limited_transparency') {
    docs.push({
      id: 'ai-transparency-notice',
      title: 'AI transparency notice',
      category: 'transparency',
      priority: 'medium',
      reason: 'Customer or employee-facing AI may require disclosure and generated-content handling rules.',
    });
  }

  if (input.riskLevel === 'high_risk_review' || input.riskLevel === 'prohibited_review') {
    docs.push(
      {
        id: 'high-risk-ai-assessment',
        title: 'High-risk AI assessment',
        category: 'risk',
        priority: input.riskLevel === 'prohibited_review' ? 'critical' : 'high',
        reason: 'Potential high-risk or prohibited-practice exposure needs formal review before production use.',
      },
      {
        id: 'vendor-model-due-diligence',
        title: 'Vendor/model due diligence pack',
        category: 'vendor_assurance',
        priority: 'high',
        reason: 'Enterprise customers will expect model/provider evidence, security posture and contractual controls.',
      },
      {
        id: 'human-oversight-plan',
        title: 'Human oversight plan',
        category: 'control',
        priority: 'high',
        reason: 'High-risk workflows need accountable review, monitoring and escalation before scale.',
      },
    );
  }

  if (input.sector === 'hr_recruiting' || input.sector === 'fintech' || input.sector === 'healthcare' || input.sector === 'financial_services') {
    docs.push({
      id: 'sector-ai-risk-addendum',
      title: 'Sector AI risk addendum',
      category: 'sector_controls',
      priority: 'high',
      reason: 'Your sector has elevated buyer and regulator expectations for AI evidence.',
    });
  }

  return docs;
}

export function getSuggestedTasks(input: {
  riskLevel: AiActRiskLevel;
  recommendedDocuments: OnboardingRecommendation[];
  inviteEmails: string[];
}): OnboardingTaskSuggestion[] {
  const tasks: OnboardingTaskSuggestion[] = [
    {
      id: 'confirm-ai-system-owner',
      title: 'Confirm accountable owner for first AI system',
      description: 'Validate who owns the system, review cadence and escalation path.',
      priority: 'high',
      dueInDays: 3,
    },
    {
      id: 'review-generated-documents',
      title: 'Review recommended AI governance documents',
      description: `Start with ${input.recommendedDocuments.slice(0, 3).map((document) => document.title).join(', ')}.`,
      priority: 'medium',
      dueInDays: 7,
    },
  ];

  if (input.riskLevel === 'high_risk_review' || input.riskLevel === 'prohibited_review') {
    tasks.unshift({
      id: 'schedule-risk-review',
      title: 'Schedule formal AI risk review',
      description: 'Do not scale this system until legal, security or compliance has reviewed the classification.',
      priority: input.riskLevel === 'prohibited_review' ? 'critical' : 'high',
      dueInDays: 2,
    });
  }

  if (input.inviteEmails.length === 0) {
    tasks.push({
      id: 'invite-compliance-collaborator',
      title: 'Invite a compliance, legal or security teammate',
      description: 'Onboarding can continue without a teammate, but readiness improves when ownership is shared.',
      priority: 'low',
      dueInDays: 10,
    });
  }

  return tasks;
}

export function calculateInitialReadinessScore(input: {
  hasOrganization: boolean;
  hasCountry: boolean;
  hasCompanyType: boolean;
  hasSector: boolean;
  hasAiUsage: boolean;
  hasFirstAiSystem: boolean;
  hasRiskClassification: boolean;
  recommendedDocuments: OnboardingRecommendation[];
  suggestedTasks: OnboardingTaskSuggestion[];
  invitedEmails: string[];
  selectedPlan: PlanIntent | string;
}) {
  let score = 0;

  if (input.hasOrganization) score += 15;
  if (input.hasCountry) score += 10;
  if (input.hasCompanyType) score += 10;
  if (input.hasSector) score += 10;
  if (input.hasAiUsage) score += 10;
  if (input.hasFirstAiSystem) score += 20;
  if (input.hasRiskClassification) score += 10;
  if (input.recommendedDocuments.length > 0) score += 5;
  if (input.suggestedTasks.length > 0) score += 5;
  if (input.invitedEmails.length > 0) score += 3;
  if (input.selectedPlan !== 'trial') score += 2;

  return Math.max(0, Math.min(100, score));
}
