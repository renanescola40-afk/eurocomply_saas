import type { OrganizationPermission, OrganizationRole } from './rbac';
import { roleHasPermission } from './rbac';

export type SecurityScenarioId =
  | 'tenant_cross_org_read_blocked'
  | 'viewer_export_blocked'
  | 'member_billing_blocked'
  | 'editor_team_management_blocked'
  | 'member_document_upload_allowed'
  | 'viewer_document_upload_blocked'
  | 'editor_ai_governance_allowed'
  | 'viewer_ai_governance_write_blocked'
  | 'editor_ai_incident_allowed'
  | 'viewer_ai_incident_write_blocked'
  | 'admin_audit_read_allowed'
  | 'viewer_audit_read_blocked'
  | 'owner_billing_allowed'
  | 'admin_enterprise_export_allowed';

export type SecurityScenario = {
  id: SecurityScenarioId;
  title: string;
  category: 'tenant_isolation' | 'rbac' | 'billing' | 'documents' | 'ai_governance' | 'audit' | 'exports';
  actorRole: OrganizationRole;
  permission: OrganizationPermission;
  expectedAllowed: boolean;
  planGate?: 'professional' | 'business' | 'enterprise';
  evidence: string[];
  threat: string;
};

export const SECURITY_SCENARIOS: SecurityScenario[] = [
  {
    id: 'tenant_cross_org_read_blocked',
    title: 'User cannot read resources from another organization',
    category: 'tenant_isolation',
    actorRole: 'admin',
    permission: 'read_documents',
    expectedAllowed: true,
    evidence: ['Supabase RLS policies', 'organization_id filters', 'scripts/security/check-rls.mjs'],
    threat: 'Cross-tenant IDOR against documents, vendors, risks, AI systems or incidents.',
  },
  {
    id: 'viewer_export_blocked',
    title: 'Viewer cannot export regulated evidence packs',
    category: 'exports',
    actorRole: 'viewer',
    permission: 'export_data',
    expectedAllowed: false,
    planGate: 'business',
    evidence: ['src/server/security/rbac.ts', 'src/server/billing/entitlements.ts', 'scripts/security/check-api-guards.mjs'],
    threat: 'Read-only user exfiltrates sensitive procurement or audit evidence.',
  },
  {
    id: 'member_billing_blocked',
    title: 'Member cannot manage billing or create Stripe portal sessions',
    category: 'billing',
    actorRole: 'member',
    permission: 'manage_billing',
    expectedAllowed: false,
    evidence: ['src/app/api/billing/checkout/route.ts', 'src/app/api/billing/portal/route.ts'],
    threat: 'Non-admin user changes billing state or accesses customer portal.',
  },
  {
    id: 'editor_team_management_blocked',
    title: 'Editor cannot manage team membership',
    category: 'rbac',
    actorRole: 'editor',
    permission: 'manage_team',
    expectedAllowed: false,
    evidence: ['src/server/security/rbac.ts'],
    threat: 'Operational user escalates privileges by inviting or modifying members.',
  },
  {
    id: 'member_document_upload_allowed',
    title: 'Member can upload operational documents within quota',
    category: 'documents',
    actorRole: 'member',
    permission: 'manage_documents',
    expectedAllowed: true,
    evidence: ['src/app/api/documents/upload/route.ts', 'src/server/security/file-signature.ts'],
    threat: 'Document workflow is too restrictive for operational users.',
  },
  {
    id: 'viewer_document_upload_blocked',
    title: 'Viewer cannot upload controlled documents',
    category: 'documents',
    actorRole: 'viewer',
    permission: 'manage_documents',
    expectedAllowed: false,
    evidence: ['src/app/api/documents/upload/route.ts', 'scripts/security/check-upload-security.mjs'],
    threat: 'Read-only user uploads untrusted or misleading compliance artefacts.',
  },
  {
    id: 'editor_ai_governance_allowed',
    title: 'Editor can manage AI governance inventory',
    category: 'ai_governance',
    actorRole: 'editor',
    permission: 'manage_ai_governance',
    expectedAllowed: true,
    evidence: ['src/app/api/ai-systems/route.ts', 'src/server/ai-governance/classifier.ts'],
    threat: 'AI governance workflow blocks legitimate operational owners.',
  },
  {
    id: 'viewer_ai_governance_write_blocked',
    title: 'Viewer cannot create or modify AI systems',
    category: 'ai_governance',
    actorRole: 'viewer',
    permission: 'manage_ai_governance',
    expectedAllowed: false,
    evidence: ['src/app/api/ai-systems/route.ts', 'src/server/security/rbac.ts'],
    threat: 'Read-only user falsifies AI Act inventory or risk classification.',
  },
  {
    id: 'editor_ai_incident_allowed',
    title: 'Editor can record AI incidents',
    category: 'ai_governance',
    actorRole: 'editor',
    permission: 'manage_ai_incidents',
    expectedAllowed: true,
    evidence: ['src/app/api/ai-incidents/route.ts', 'src/lib/ai-governance/incidents.ts'],
    threat: 'Incident reporting is blocked for operational responders.',
  },
  {
    id: 'viewer_ai_incident_write_blocked',
    title: 'Viewer cannot create AI incidents',
    category: 'ai_governance',
    actorRole: 'viewer',
    permission: 'manage_ai_incidents',
    expectedAllowed: false,
    evidence: ['src/app/api/ai-incidents/route.ts', 'src/server/security/rbac.ts'],
    threat: 'Read-only user creates false incident records.',
  },
  {
    id: 'admin_audit_read_allowed',
    title: 'Admin can read audit evidence and audit trails',
    category: 'audit',
    actorRole: 'admin',
    permission: 'read_audit',
    expectedAllowed: true,
    evidence: ['src/server/security/rbac.ts', 'src/server/queries/audit-events.ts'],
    threat: 'Compliance administrator cannot investigate events.',
  },
  {
    id: 'viewer_audit_read_blocked',
    title: 'Viewer cannot read audit trails',
    category: 'audit',
    actorRole: 'viewer',
    permission: 'read_audit',
    expectedAllowed: false,
    evidence: ['src/server/security/rbac.ts'],
    threat: 'Read-only user observes sensitive audit metadata.',
  },
  {
    id: 'owner_billing_allowed',
    title: 'Owner can manage billing',
    category: 'billing',
    actorRole: 'owner',
    permission: 'manage_billing',
    expectedAllowed: true,
    evidence: ['src/app/api/billing/checkout/route.ts', 'src/app/api/billing/portal/route.ts'],
    threat: 'Workspace owner cannot manage paid subscription.',
  },
  {
    id: 'admin_enterprise_export_allowed',
    title: 'Admin can export enterprise evidence when plan allows it',
    category: 'exports',
    actorRole: 'admin',
    permission: 'export_data',
    expectedAllowed: true,
    planGate: 'business',
    evidence: ['src/app/api/audit/evidence-pack/route.ts', 'src/app/api/security-questionnaire/export/route.ts'],
    threat: 'Compliance admin cannot satisfy customer due diligence requests.',
  },
];

export function evaluateSecurityScenario(scenario: SecurityScenario) {
  return roleHasPermission(scenario.actorRole, scenario.permission) === scenario.expectedAllowed;
}

export function getSecurityScenarioMatrix() {
  return SECURITY_SCENARIOS.map((scenario) => ({
    ...scenario,
    passesCurrentRbacModel: evaluateSecurityScenario(scenario),
  }));
}

export function getFailedSecurityScenarios() {
  return getSecurityScenarioMatrix().filter((scenario) => !scenario.passesCurrentRbacModel);
}
