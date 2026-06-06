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
];

export function getComplianceTemplate(templateId: string) {
  return COMPLIANCE_TEMPLATES.find((template) => template.id === templateId);
}
