import type { Locale } from '@/lib/i18n/routing';
import type { AiSystemRecord } from '@/server/queries/ai-systems';
import type { AiIncidentRecord } from '@/server/queries/ai-incidents';

export type AiComplianceCapabilityId =
  | 'ai_systems_inventory'
  | 'eu_ai_act_risk_classification'
  | 'ai_usage_questionnaire'
  | 'ai_governance_dashboard'
  | 'document_generator_flow'
  | 'policy_pack_generator'
  | 'employee_ai_usage_policy'
  | 'ai_vendor_assessment'
  | 'ai_incident_register'
  | 'evidence_pack'
  | 'readiness_score'
  | 'gap_analysis'
  | 'action_plan'
  | 'export_ready_reports'
  | 'board_audit_summary'
  | 'country_aware_context'
  | 'role_based_workflow';

export type AiComplianceCapability = {
  id: AiComplianceCapabilityId;
  title: string;
  route: string;
  outcome: string;
  dataSource: 'ai_systems' | 'ai_incidents' | 'vendors' | 'documents' | 'organization_members' | 'computed';
};

export const AI_COMPLIANCE_PRODUCT_MAP: AiComplianceCapability[] = [
  {
    id: 'ai_systems_inventory',
    title: 'AI Systems Inventory',
    route: '/ai-systems',
    outcome: 'System of record for every AI use case, owner, lifecycle status and organization_id.',
    dataSource: 'ai_systems',
  },
  {
    id: 'eu_ai_act_risk_classification',
    title: 'EU AI Act risk classification',
    route: '/ai-systems',
    outcome: 'Risk level, initial obligations and next actions are generated from questionnaire answers.',
    dataSource: 'ai_systems',
  },
  {
    id: 'ai_usage_questionnaire',
    title: 'AI usage questionnaire',
    route: '/ai-questionnaire',
    outcome: 'Structured intake questions that feed inventory, role validation, risk domain and transparency checks.',
    dataSource: 'ai_systems',
  },
  {
    id: 'ai_governance_dashboard',
    title: 'AI governance dashboard',
    route: '/dashboard/organizations',
    outcome: 'Executive cockpit for readiness score, open work, evidence status and audit posture.',
    dataSource: 'computed',
  },
  {
    id: 'document_generator_flow',
    title: 'Document generator flow',
    route: '/document-generator',
    outcome: 'Export-ready board, audit, policy and action-plan documents built from live workspace data.',
    dataSource: 'computed',
  },
  {
    id: 'policy_pack_generator',
    title: 'Policy pack generator',
    route: '/policy-pack',
    outcome: 'Enterprise AI policy pack assembled from the current inventory and risk exposure.',
    dataSource: 'computed',
  },
  {
    id: 'employee_ai_usage_policy',
    title: 'Employee AI usage policy',
    route: '/policy-pack#employee-ai-usage-policy',
    outcome: 'Clear employee-facing rules for approved AI use, data handling, disclosure and escalation.',
    dataSource: 'computed',
  },
  {
    id: 'ai_vendor_assessment',
    title: 'AI vendor assessment',
    route: '/vendor-assurance',
    outcome: 'Vendor assurance workflow for model/provider evidence and third-party AI exposure.',
    dataSource: 'vendors',
  },
  {
    id: 'ai_incident_register',
    title: 'AI incident register',
    route: '/ai-incidents',
    outcome: 'Incident triage register with severity, deadline plan, authority context and audit trail.',
    dataSource: 'ai_incidents',
  },
  {
    id: 'evidence_pack',
    title: 'Evidence pack',
    route: '/audit-pack',
    outcome: 'Structured evidence snapshot for audit, customer security review and procurement diligence.',
    dataSource: 'documents',
  },
  {
    id: 'readiness_score',
    title: 'Readiness score',
    route: '/ai-systems#readiness-score',
    outcome: 'Score is calculated only from real inventory, ownership, vendor, incident and classification data.',
    dataSource: 'computed',
  },
  {
    id: 'gap_analysis',
    title: 'Gap analysis',
    route: '/dashboard/gap-analysis',
    outcome: 'Prioritized missing controls and evidence areas for AI governance remediation.',
    dataSource: 'computed',
  },
  {
    id: 'action_plan',
    title: 'Action plan',
    route: '/aprovacoes',
    outcome: 'Operational queue for owners, admins and members to close readiness gaps.',
    dataSource: 'computed',
  },
  {
    id: 'export_ready_reports',
    title: 'Export-ready reports',
    route: '/dashboard/organizations/reports-governance',
    outcome: 'Board and audit outputs formatted for printing, PDF export and evidence reviews.',
    dataSource: 'computed',
  },
  {
    id: 'board_audit_summary',
    title: 'Board/audit summary',
    route: '/dashboard/organizations/reports-governance',
    outcome: 'Executive narrative for board, audit committee and customer trust reviews.',
    dataSource: 'computed',
  },
  {
    id: 'country_aware_context',
    title: 'Country-aware compliance context',
    route: '/ai-questionnaire#country-aware-context',
    outcome: 'Locale-aware EU context that keeps local authority, language and evidence expectations visible.',
    dataSource: 'computed',
  },
  {
    id: 'role_based_workflow',
    title: 'Role-based workflow for owner/admin/member/viewer',
    route: '/security-center',
    outcome: 'Governance workflow makes accountable owners, approvers, contributors and viewers explicit.',
    dataSource: 'organization_members',
  },
];

export type AiGovernanceGap = {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
  route: string;
};

export type AiGovernanceAction = {
  id: string;
  ownerRole: 'owner' | 'admin' | 'member' | 'viewer';
  title: string;
  description: string;
  route: string;
};

export type AiGovernanceReadiness = {
  score: number | null;
  status: 'not_started' | 'needs_data' | 'attention' | 'ready';
  totals: {
    systems: number;
    highRisk: number;
    limitedTransparency: number;
    prohibitedReview: number;
    incidents: number;
    openIncidents: number;
    ownedSystems: number;
    vendorLinkedSystems: number;
  };
  coverage: {
    inventory: number;
    classification: number;
    owners: number;
    vendors: number;
    highRiskGovernance: number;
    incidentRegister: number;
    policyPack: number;
  };
  gaps: AiGovernanceGap[];
  actionPlan: AiGovernanceAction[];
  boardSummary: string;
  countryContext: {
    locale: Locale;
    regionLabel: string;
    language: string;
    guidance: string[];
  };
  capabilities: AiComplianceCapability[];
};

const localeContext: Record<Locale, AiGovernanceReadiness['countryContext']> = {
  en: {
    locale: 'en',
    regionLabel: 'Europe / International',
    language: 'English',
    guidance: [
      'Keep the AI system inventory exportable in English for cross-border procurement and audit reviews.',
      'Capture the operating country per AI system when the customer has multi-country deployments.',
      'Map national market-surveillance authority details during enterprise onboarding before formal reporting.',
    ],
  },
  pt: {
    locale: 'pt',
    regionLabel: 'Portugal',
    language: 'Português de Portugal',
    guidance: [
      'Mantenha políticas e evidências críticas em português quando a equipa operacional estiver em Portugal.',
      'Registe o país de operação por sistema de IA para separar obrigações locais de obrigações pan-europeias.',
      'Confirme a autoridade nacional aplicável durante o onboarding enterprise antes de qualquer reporte formal.',
    ],
  },
  es: {
    locale: 'es',
    regionLabel: 'España',
    language: 'Español',
    guidance: [
      'Mantén políticas y evidencias críticas en español para equipos operativos en España.',
      'Registra el país de operación por sistema de IA para separar obligaciones locales y europeas.',
      'Confirma la autoridad nacional aplicable durante el onboarding enterprise antes de cualquier reporte formal.',
    ],
  },
  fr: {
    locale: 'fr',
    regionLabel: 'France',
    language: 'Français',
    guidance: [
      'Conservez les politiques et preuves critiques en français lorsque les équipes opèrent en France.',
      'Renseignez le pays d’exploitation de chaque système IA pour distinguer obligations locales et européennes.',
      'Validez l’autorité nationale applicable pendant l’onboarding enterprise avant tout signalement formel.',
    ],
  },
  it: {
    locale: 'it',
    regionLabel: 'Italia',
    language: 'Italiano',
    guidance: [
      'Mantieni policy ed evidenze critiche in italiano per i team operativi in Italia.',
      'Registra il paese operativo per ogni sistema IA per separare obblighi locali e pan-europei.',
      'Conferma l’autorità nazionale applicabile durante l’onboarding enterprise prima di qualsiasi report formale.',
    ],
  },
  de: {
    locale: 'de',
    regionLabel: 'Deutschland / DACH',
    language: 'Deutsch',
    guidance: [
      'Halten Sie kritische Richtlinien und Nachweise auf Deutsch bereit, wenn operative Teams in DACH arbeiten.',
      'Erfassen Sie das Einsatzland je KI-System, um lokale und europäische Pflichten sauber zu trennen.',
      'Bestätigen Sie die zuständige nationale Behörde im Enterprise-Onboarding vor formellen Meldungen.',
    ],
  },
};

function percentage(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function isHighRisk(system: AiSystemRecord) {
  return system.risk_level === 'high_risk_review' || system.risk_level === 'prohibited_review';
}

function isLimitedTransparency(system: AiSystemRecord) {
  return system.risk_level === 'limited_transparency';
}

function hasClassification(system: AiSystemRecord) {
  return Boolean(system.risk_level && system.classification_summary && system.obligations?.length && system.next_actions?.length);
}

function hasOwner(system: AiSystemRecord) {
  return Boolean(system.owner_team?.trim());
}

function hasVendor(system: AiSystemRecord) {
  return Boolean(system.vendor_name?.trim());
}

function isOpenIncident(incident: AiIncidentRecord) {
  return incident.report_status !== 'closed' && incident.report_status !== 'reported';
}

export function getCountryAwareContext(locale: string): AiGovernanceReadiness['countryContext'] {
  const safeLocale = (locale in localeContext ? locale : 'en') as Locale;
  return localeContext[safeLocale];
}

export function buildAiGovernanceReadiness(input: {
  locale: string;
  systems: AiSystemRecord[];
  incidents: AiIncidentRecord[];
}): AiGovernanceReadiness {
  const { systems, incidents } = input;
  const totalSystems = systems.length;
  const highRiskSystems = systems.filter(isHighRisk);
  const ownedSystems = systems.filter(hasOwner);
  const vendorLinkedSystems = systems.filter(hasVendor);
  const classifiedSystems = systems.filter(hasClassification);
  const openIncidents = incidents.filter(isOpenIncident);
  const prohibitedReview = systems.filter((system) => system.risk_level === 'prohibited_review').length;
  const limitedTransparency = systems.filter(isLimitedTransparency).length;
  const highRiskGovernanceReady = highRiskSystems.filter((system) => hasOwner(system) && (hasVendor(system) || system.role === 'provider')).length;

  const coverage = {
    inventory: totalSystems > 0 ? 100 : 0,
    classification: percentage(classifiedSystems.length, totalSystems),
    owners: percentage(ownedSystems.length, totalSystems),
    vendors: percentage(vendorLinkedSystems.length, totalSystems),
    highRiskGovernance: highRiskSystems.length === 0 && totalSystems > 0 ? 100 : percentage(highRiskGovernanceReady, highRiskSystems.length),
    incidentRegister: incidents.length > 0 ? 100 : 0,
    policyPack: totalSystems > 0 ? 100 : 0,
  };

  const gaps: AiGovernanceGap[] = [];

  if (totalSystems === 0) {
    gaps.push({
      id: 'inventory-empty',
      severity: 'critical',
      title: 'No AI systems registered',
      description: 'Readiness cannot be scored until at least one AI system or AI use case is in the inventory.',
      action: 'Run the AI usage questionnaire and register the first system.',
      route: '/ai-questionnaire',
    });
  }

  if (coverage.classification < 100 && totalSystems > 0) {
    gaps.push({
      id: 'classification-incomplete',
      severity: 'high',
      title: 'Risk classification coverage is incomplete',
      description: 'Every AI system should carry an EU AI Act risk level, obligations and next actions.',
      action: 'Review inventory entries and complete missing classification fields.',
      route: '/ai-systems',
    });
  }

  if (coverage.owners < 100 && totalSystems > 0) {
    gaps.push({
      id: 'owners-missing',
      severity: 'high',
      title: 'Some AI systems do not have an accountable owner',
      description: 'Enterprise buyers expect clear accountability for AI use cases, approvals and evidence.',
      action: 'Assign owner/admin/member responsibility for every AI system.',
      route: '/security-center',
    });
  }

  if (highRiskSystems.length > 0 && coverage.highRiskGovernance < 100) {
    gaps.push({
      id: 'high-risk-governance',
      severity: prohibitedReview > 0 ? 'critical' : 'high',
      title: 'High-risk governance evidence is incomplete',
      description: 'High-risk or prohibited-practice review items need owner, vendor/model context and evidence before production.',
      action: 'Attach vendor evidence, owner approval and formal legal/compliance review.',
      route: '/ai-systems',
    });
  }

  if (limitedTransparency > 0) {
    gaps.push({
      id: 'transparency-review',
      severity: 'medium',
      title: 'Transparency obligations need review',
      description: 'Systems that interact with people or generate content may require clear AI disclosure and employee guidance.',
      action: 'Generate the employee AI usage policy and transparency notices.',
      route: '/policy-pack#employee-ai-usage-policy',
    });
  }

  if (incidents.length === 0 && totalSystems > 0) {
    gaps.push({
      id: 'incident-register-empty',
      severity: 'medium',
      title: 'Incident register is not initialized',
      description: 'No incident records exist yet. Keep an empty professional register and escalation procedure ready before enterprise sale.',
      action: 'Open the AI incident register and document the incident intake workflow.',
      route: '/ai-incidents',
    });
  }

  const actionPlan: AiGovernanceAction[] = [
    {
      id: 'owner-inventory',
      ownerRole: 'owner',
      title: 'Approve AI inventory scope',
      description: 'Confirm every active, pilot and planned AI system is captured under the current organization_id.',
      route: '/ai-systems',
    },
    {
      id: 'admin-classification',
      ownerRole: 'admin',
      title: 'Complete EU AI Act classification',
      description: 'Validate risk level, role, domain, personal-data processing and transparency flags.',
      route: '/ai-questionnaire',
    },
    {
      id: 'member-evidence',
      ownerRole: 'member',
      title: 'Attach operational evidence',
      description: 'Add vendor documentation, policies, approvals and review notes to the evidence pack.',
      route: '/audit-pack',
    },
    {
      id: 'viewer-board',
      ownerRole: 'viewer',
      title: 'Review board/audit summary',
      description: 'Give executives a read-only view of readiness, open gaps and next decisions.',
      route: '/dashboard/organizations/reports-governance',
    },
  ];

  const score = totalSystems === 0
    ? null
    : Math.round(
        coverage.inventory * 0.15 +
        coverage.classification * 0.2 +
        coverage.owners * 0.15 +
        coverage.vendors * 0.1 +
        coverage.highRiskGovernance * 0.2 +
        coverage.incidentRegister * 0.1 +
        coverage.policyPack * 0.1,
      );

  const status = score === null
    ? 'not_started'
    : score >= 85 && gaps.filter((gap) => gap.severity === 'critical' || gap.severity === 'high').length === 0
      ? 'ready'
      : score >= 55
        ? 'attention'
        : 'needs_data';

  const boardSummary = score === null
    ? 'AI Act readiness is not yet assessable because no AI systems have been registered.'
    : `AI Act readiness is ${score}% based on ${totalSystems} registered AI system${totalSystems === 1 ? '' : 's'}, ${highRiskSystems.length} high-risk review item${highRiskSystems.length === 1 ? '' : 's'} and ${openIncidents.length} open incident assessment${openIncidents.length === 1 ? '' : 's'}.`;

  return {
    score,
    status,
    totals: {
      systems: totalSystems,
      highRisk: highRiskSystems.length,
      limitedTransparency,
      prohibitedReview,
      incidents: incidents.length,
      openIncidents: openIncidents.length,
      ownedSystems: ownedSystems.length,
      vendorLinkedSystems: vendorLinkedSystems.length,
    },
    coverage,
    gaps,
    actionPlan,
    boardSummary,
    countryContext: getCountryAwareContext(input.locale),
    capabilities: AI_COMPLIANCE_PRODUCT_MAP,
  };
}

export function localizeCapabilityRoute(locale: string, route: string) {
  const normalized = route.startsWith('/') ? route : `/${route}`;
  return `/${locale}${normalized}`;
}
