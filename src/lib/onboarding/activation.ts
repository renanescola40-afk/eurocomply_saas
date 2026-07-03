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
    onboardingCompletedAt: string | null;
    isOnboardingCompleted: boolean;
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

export type OnboardingActionResult = {
  organizationId: string;
  status: 'saved' | 'completed';
  readinessScore?: number;
  riskLevel?: string;
  dashboardPath?: string;
  documentsCreated?: number;
  tasksCreated?: number;
  invitationsCreated?: number;
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
      return 'Restricted-use review';
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
    { id: 'ai-system-inventory', title: 'AI system inventory', category: 'governance', priority: 'high', reason: 'Record owner, purpose, lifecycle status and organization scope.' },
    { id: 'employee-ai-use-policy', title: 'Employee AI usage policy', category: 'policy', priority: 'medium', reason: 'Staff need rules for approved tools, data handling and escalation.' },
    { id: 'ai-governance-summary', title: 'AI governance board summary', category: 'reporting', priority: 'medium', reason: 'Leadership should see readiness, open gaps and ownership from day one.' },
  ];

  if (input.usesPersonalData) {
    docs.push({ id: 'personal-data-ai-dpia-screening', title: 'AI personal data DPIA screening', category: 'privacy', priority: 'high', reason: 'Personal data use needs documented privacy review.' });
  }

  if (input.interactsWithPeople || input.generatesContent) {
    docs.push({ id: 'transparency-notice', title: 'User-facing AI transparency notice', category: 'transparency', priority: 'high', reason: 'User-facing AI should have clear disclosure and content handling notes.' });
  }

  if (input.riskLevel === 'high_risk_review' || input.riskLevel === 'prohibited_review') {
    docs.push({ id: 'high-risk-classification-record', title: 'Risk classification record', category: 'risk', priority: 'critical', reason: 'Elevated risk use cases need documented classification rationale.' });
  }

  if (input.sector === 'hr_recruiting' || input.sector === 'financial_services' || input.sector === 'fintech') {
    docs.push({ id: 'human-oversight-playbook', title: 'Human oversight playbook', category: 'operations', priority: 'high', reason: 'Regulated workflows need review, escalation and accountability controls.' });
  }

  return docs;
}

export { calculateInitialReadinessScore, getSuggestedTasks } from './activation-scoring';
