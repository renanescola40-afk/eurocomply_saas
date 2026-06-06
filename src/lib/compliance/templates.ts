export type ComplianceTemplateCategory = 'gdpr' | 'risk' | 'vendor' | 'security' | 'incident';

export type ComplianceTemplate = {
  id: string;
  title: string;
  category: ComplianceTemplateCategory;
  description: string;
  recommendedOwner: string;
  sections: string[];
};

export const COMPLIANCE_TEMPLATES: ComplianceTemplate[] = [
  {
    id: 'gdpr-ropa',
    title: 'GDPR Record of Processing Activities',
    category: 'gdpr',
    description: 'Map processing purposes, lawful basis, data categories, recipients and retention periods.',
    recommendedOwner: 'Data Protection Officer',
    sections: ['Processing purpose', 'Lawful basis', 'Data categories', 'Recipients', 'Retention period', 'Security measures'],
  },
  {
    id: 'gdpr-dpia',
    title: 'Data Protection Impact Assessment',
    category: 'gdpr',
    description: 'Assess high-risk processing, mitigation measures and residual privacy risks.',
    recommendedOwner: 'Privacy Lead',
    sections: ['Processing overview', 'Necessity and proportionality', 'Risk analysis', 'Mitigations', 'Residual risk', 'Approval'],
  },
  {
    id: 'vendor-risk-questionnaire',
    title: 'Vendor Risk Questionnaire',
    category: 'vendor',
    description: 'Collect vendor security, privacy, hosting, subprocessors and incident response evidence.',
    recommendedOwner: 'Vendor Manager',
    sections: ['Company profile', 'Data access', 'Security controls', 'Subprocessors', 'Incident response', 'DPA status'],
  },
  {
    id: 'risk-register',
    title: 'Compliance Risk Register',
    category: 'risk',
    description: 'Track risk likelihood, impact, mitigation owner, due dates and review status.',
    recommendedOwner: 'Risk Owner',
    sections: ['Risk statement', 'Likelihood', 'Impact', 'Mitigation plan', 'Owner', 'Review cadence'],
  },
  {
    id: 'incident-response',
    title: 'Privacy Incident Response Checklist',
    category: 'incident',
    description: 'Coordinate triage, containment, legal review, notification decisions and postmortems.',
    recommendedOwner: 'Security Lead',
    sections: ['Triage', 'Containment', 'Evidence collection', 'Notification assessment', 'Communication plan', 'Postmortem'],
  },
  {
    id: 'iso-controls-baseline',
    title: 'ISO 27001 Control Evidence Baseline',
    category: 'security',
    description: 'Prepare evidence for access control, change management, vendor security and incident controls.',
    recommendedOwner: 'Security Manager',
    sections: ['Access control', 'Asset inventory', 'Change management', 'Supplier security', 'Logging', 'Incident management'],
  },
  {
    id: 'data-retention-policy',
    title: 'Data Retention Policy',
    category: 'gdpr',
    description: 'Define retention rules, disposal triggers and accountability for personal data and compliance records.',
    recommendedOwner: 'Data Protection Officer',
    sections: ['Scope', 'Retention schedule', 'Legal holds', 'Secure deletion', 'Owner responsibilities', 'Review cadence'],
  },
  {
    id: 'consent-register',
    title: 'Consent Register',
    category: 'gdpr',
    description: 'Track consent collection, withdrawal, source, purpose and evidence for consent-based processing.',
    recommendedOwner: 'Privacy Lead',
    sections: ['Consent purpose', 'Collection source', 'Consent evidence', 'Withdrawal handling', 'System of record', 'Review notes'],
  },
  {
    id: 'data-subject-request-log',
    title: 'Data Subject Request Log',
    category: 'gdpr',
    description: 'Operational log for access, deletion, rectification, portability and objection requests.',
    recommendedOwner: 'Privacy Operations Manager',
    sections: ['Request type', 'Requester verification', 'Deadline', 'Systems searched', 'Response summary', 'Closure evidence'],
  },
  {
    id: 'access-review',
    title: 'Access Review',
    category: 'security',
    description: 'Review user access to critical systems, privileged roles and stale accounts.',
    recommendedOwner: 'Security Manager',
    sections: ['System scope', 'Privileged users', 'Joiner/mover/leaver checks', 'Exceptions', 'Remediation actions', 'Approval'],
  },
  {
    id: 'asset-inventory',
    title: 'Asset Inventory',
    category: 'security',
    description: 'Maintain a current inventory of applications, infrastructure, data stores and business owners.',
    recommendedOwner: 'IT Manager',
    sections: ['Asset name', 'Business owner', 'Data classification', 'Hosting location', 'Criticality', 'Review date'],
  },
  {
    id: 'change-management',
    title: 'Change Management',
    category: 'security',
    description: 'Document production changes, approvals, testing evidence, rollback plans and post-change validation.',
    recommendedOwner: 'Engineering Manager',
    sections: ['Change summary', 'Risk assessment', 'Approval', 'Testing evidence', 'Rollback plan', 'Post-change validation'],
  },
  {
    id: 'business-continuity-plan',
    title: 'Business Continuity Plan',
    category: 'risk',
    description: 'Prepare continuity objectives, recovery priorities, dependencies and communication procedures.',
    recommendedOwner: 'Operations Lead',
    sections: ['Critical processes', 'Recovery objectives', 'Key dependencies', 'Continuity procedures', 'Communication plan', 'Test schedule'],
  },
  {
    id: 'incident-register',
    title: 'Incident Register',
    category: 'incident',
    description: 'Track security and privacy incidents from intake through closure and lessons learned.',
    recommendedOwner: 'Security Lead',
    sections: ['Incident summary', 'Severity', 'Impact assessment', 'Containment', 'Root cause', 'Corrective actions'],
  },
  {
    id: 'vendor-dpa-checklist',
    title: 'Vendor DPA Checklist',
    category: 'vendor',
    description: 'Review required processor terms, subprocessors, security commitments and transfer safeguards.',
    recommendedOwner: 'Vendor Manager',
    sections: ['Processor role', 'Processing instructions', 'Subprocessors', 'Security commitments', 'International transfers', 'Termination assistance'],
  },
  {
    id: 'iso-27001-soa-baseline',
    title: 'ISO 27001 Statement of Applicability Baseline',
    category: 'security',
    description: 'Baseline control applicability, justification, implementation status and evidence for ISO 27001 readiness.',
    recommendedOwner: 'Security Manager',
    sections: ['Control domain', 'Applicability decision', 'Justification', 'Implementation status', 'Evidence reference', 'Control owner'],
  },
];

export function getComplianceTemplate(templateId: string) {
  return COMPLIANCE_TEMPLATES.find((template) => template.id === templateId);
}
