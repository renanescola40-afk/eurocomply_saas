export type SecurityQuestionnaireCategory =
  | 'company'
  | 'access_control'
  | 'data_protection'
  | 'infrastructure'
  | 'monitoring'
  | 'business_continuity'
  | 'subprocessors'
  | 'compliance';

export type SecurityQuestionnaireItem = {
  id: string;
  category: SecurityQuestionnaireCategory;
  question: string;
  answer: string;
  evidenceRefs: string[];
  readiness: 'ready' | 'partial' | 'needs_input';
};

export const SECURITY_QUESTIONNAIRE_ITEMS: SecurityQuestionnaireItem[] = [
  {
    id: 'company-overview',
    category: 'company',
    question: 'What does EuroComply do?',
    answer: 'EuroComply is a European B2B compliance platform for evidence management, risk, vendors, audit readiness and AI governance workflows.',
    evidenceRefs: ['Trust Center', 'Security page', 'Product overview'],
    readiness: 'ready',
  },
  {
    id: 'tenant-isolation',
    category: 'access_control',
    question: 'How is customer data separated between organizations?',
    answer: 'EuroComply uses organization-scoped access patterns and Supabase row-level security policies for application data isolation.',
    evidenceRefs: ['Supabase RLS migrations', 'Access Center', 'Security overview'],
    readiness: 'partial',
  },
  {
    id: 'rbac',
    category: 'access_control',
    question: 'Does the product support role-based access control?',
    answer: 'EuroComply includes centralized RBAC for organization roles such as owner, admin, editor, member and viewer, with feature-level permissions for sensitive operations.',
    evidenceRefs: ['Access Center', 'RBAC tests', 'Audit events'],
    readiness: 'ready',
  },
  {
    id: 'data-storage',
    category: 'data_protection',
    question: 'Where is application data stored?',
    answer: 'Application data is stored in Supabase-managed PostgreSQL and controlled documents use private storage buckets configured by production migrations.',
    evidenceRefs: ['Data Processing page', 'Private storage migration', 'Retention Center'],
    readiness: 'partial',
  },
  {
    id: 'audit-logging',
    category: 'monitoring',
    question: 'Are user and operational actions logged?',
    answer: 'EuroComply records audit events for key operations including billing sync, AI governance actions, evidence exports and operational changes where implemented.',
    evidenceRefs: ['Audit log', 'Evidence Pack', 'Audit events migration'],
    readiness: 'ready',
  },
  {
    id: 'incident-process',
    category: 'business_continuity',
    question: 'Is there an incident response process?',
    answer: 'EuroComply maintains incident response documentation and includes an internal AI Incident Register for governance workflows.',
    evidenceRefs: ['Incident response documentation', 'AI Incident Register', 'Continuity Center'],
    readiness: 'partial',
  },
  {
    id: 'subprocessors',
    category: 'subprocessors',
    question: 'Are subprocessors documented?',
    answer: 'EuroComply maintains a public subprocessors page and an internal Vendor Assurance Center for operational review of key providers.',
    evidenceRefs: ['Subprocessors page', 'Vendor Assurance Center', 'Evidence Pack'],
    readiness: 'ready',
  },
  {
    id: 'backups-continuity',
    category: 'business_continuity',
    question: 'How is operational continuity reviewed?',
    answer: 'Continuity controls are tracked through the Continuity Center and included in the Audit Evidence Pack for review.',
    evidenceRefs: ['Continuity Center', 'Backup and continuity documentation', 'Evidence Pack'],
    readiness: 'partial',
  },
  {
    id: 'privacy-gdpr',
    category: 'compliance',
    question: 'Is GDPR documentation available?',
    answer: 'EuroComply provides public Privacy, DPA, Subprocessors and Data Processing pages, and supports GDPR export/delete request workflows inside the product.',
    evidenceRefs: ['Privacy page', 'DPA page', 'Data Processing page', 'GDPR APIs'],
    readiness: 'ready',
  },
  {
    id: 'ai-governance',
    category: 'compliance',
    question: 'Does the product support AI governance workflows?',
    answer: 'EuroComply includes AI Systems Inventory, AI Act classification, Provider vs Deployer guidance, AI Incident Register and AI Governance readiness scoring.',
    evidenceRefs: ['AI Systems Inventory', 'AI Incident Register', 'AI Governance tests'],
    readiness: 'ready',
  },
  {
    id: 'sso-mfa',
    category: 'access_control',
    question: 'Does EuroComply support SSO and enforced MFA?',
    answer: 'Enterprise SSO and enforced MFA are roadmap items. Current authentication supports email and Google sign-in through Supabase Auth.',
    evidenceRefs: ['Auth configuration', 'Enterprise roadmap'],
    readiness: 'needs_input',
  },
  {
    id: 'certifications',
    category: 'compliance',
    question: 'Does EuroComply hold SOC 2 or ISO 27001 certification?',
    answer: 'Formal third-party certifications are not yet claimed. The product includes internal controls, evidence exports and readiness documentation to support future certification work.',
    evidenceRefs: ['Security overview', 'Evidence Pack', 'Production checklist'],
    readiness: 'needs_input',
  },
];

export type SecurityQuestionnaireSummary = {
  score: number;
  status: 'foundation' | 'review_ready' | 'enterprise_ready';
  totalItems: number;
  readyItems: number;
  partialItems: number;
  needsInputItems: number;
  categories: SecurityQuestionnaireCategory[];
  nextActions: string[];
};

export function calculateSecurityQuestionnaireScore(items: SecurityQuestionnaireItem[] = SECURITY_QUESTIONNAIRE_ITEMS) {
  if (items.length === 0) return 0;
  const score = items.reduce((total, item) => total + (item.readiness === 'ready' ? 1 : item.readiness === 'partial' ? 0.55 : 0.15), 0);
  return Math.round((score / items.length) * 100);
}

export function getSecurityQuestionnaireStatus(score: number): SecurityQuestionnaireSummary['status'] {
  if (score >= 88) return 'enterprise_ready';
  if (score >= 60) return 'review_ready';
  return 'foundation';
}

export function getSecurityQuestionnaireSummary(items: SecurityQuestionnaireItem[] = SECURITY_QUESTIONNAIRE_ITEMS): SecurityQuestionnaireSummary {
  const score = calculateSecurityQuestionnaireScore(items);
  const categories = Array.from(new Set(items.map((item) => item.category))).sort();
  const readyItems = items.filter((item) => item.readiness === 'ready').length;
  const partialItems = items.filter((item) => item.readiness === 'partial').length;
  const needsInputItems = items.filter((item) => item.readiness === 'needs_input').length;
  const nextActions = items
    .filter((item) => item.readiness !== 'ready')
    .slice(0, 5)
    .map((item) => `Review questionnaire item: ${item.question}`);

  return {
    score,
    status: getSecurityQuestionnaireStatus(score),
    totalItems: items.length,
    readyItems,
    partialItems,
    needsInputItems,
    categories,
    nextActions: nextActions.length > 0 ? nextActions : ['Keep questionnaire answers aligned with product and operational changes.'],
  };
}
