export type QuestionnaireAnswerStatus = 'implemented' | 'configuration-bound' | 'evidence-required' | 'not-claimed';

export type SecurityQuestionnaireAnswer = {
  id: string;
  category: 'governance' | 'access-control' | 'data-protection' | 'operations' | 'compliance' | 'suppliers';
  question: string;
  answer: string;
  status: QuestionnaireAnswerStatus;
  evidence: string[];
  caveat?: string;
};

export type SecurityQuestionnairePack = {
  product: 'RISCK COMPLY';
  version: '2026-07';
  generatedAt: string;
  disclosure: string;
  answers: SecurityQuestionnaireAnswer[];
};

const answers: SecurityQuestionnaireAnswer[] = [
  {
    id: 'GOV-01',
    category: 'governance',
    question: 'Does the service maintain documented security and operational controls?',
    answer: 'Yes. Repository-controlled security checks, release gates, incident runbooks and evidence-oriented operating documentation are maintained.',
    status: 'implemented',
    evidence: ['/trust', '/security', '/trust/procurement-pack'],
  },
  {
    id: 'IAM-01',
    category: 'access-control',
    question: 'Is customer access scoped by organization and role?',
    answer: 'The product is designed around authenticated organization membership, role-aware permissions, server-side authorization and Supabase Row Level Security.',
    status: 'implemented',
    evidence: ['/security', '/trust/procurement-pack'],
    caveat: 'Production tenant-isolation evidence must match the active Supabase project and release SHA.',
  },
  {
    id: 'IAM-02',
    category: 'access-control',
    question: 'Is single sign-on available?',
    answer: 'Enterprise identity capabilities are configuration- and contract-bound. Availability must be confirmed for the customer plan and deployed environment.',
    status: 'configuration-bound',
    evidence: ['/enterprise', '/pricing'],
  },
  {
    id: 'DATA-01',
    category: 'data-protection',
    question: 'Is data encrypted in transit and at rest?',
    answer: 'Public traffic is expected to use HTTPS/TLS. Encryption at rest relies on the configured managed providers and their active project controls.',
    status: 'configuration-bound',
    evidence: ['/security', '/data-processing', '/subprocessors'],
  },
  {
    id: 'DATA-02',
    category: 'data-protection',
    question: 'Can customers request data export or deletion?',
    answer: 'Workspace administrators can request export or deletion support. Contractual retention and backup windows remain provider- and agreement-specific.',
    status: 'implemented',
    evidence: ['/privacy', '/data-processing', '/dpa'],
  },
  {
    id: 'OPS-01',
    category: 'operations',
    question: 'Are incidents and recovery procedures documented?',
    answer: 'Yes. Incident response, rollback and operational recovery procedures are documented and linked to release evidence.',
    status: 'implemented',
    evidence: ['/status', '/sla', '/trust/procurement-pack'],
  },
  {
    id: 'OPS-02',
    category: 'operations',
    question: 'Does the service guarantee a public uptime percentage?',
    answer: 'No default public uptime guarantee is claimed. Enterprise service levels are contract-specific and must be supported by production evidence.',
    status: 'not-claimed',
    evidence: ['/sla', '/status'],
  },
  {
    id: 'COMP-01',
    category: 'compliance',
    question: 'Is the service SOC 2 or ISO 27001 certified?',
    answer: 'No SOC 2 or ISO 27001 certification is claimed unless a current, dated and verifiable certificate is published.',
    status: 'not-claimed',
    evidence: ['/security', '/trust/procurement-pack'],
  },
  {
    id: 'COMP-02',
    category: 'compliance',
    question: 'Does the service guarantee EU AI Act compliance?',
    answer: 'No. RISCK COMPLY supports AI governance operations, readiness and evidence preparation but does not replace legal counsel or guarantee regulatory outcomes.',
    status: 'not-claimed',
    evidence: ['/compliance', '/trust/procurement-pack'],
  },
  {
    id: 'SUP-01',
    category: 'suppliers',
    question: 'Are subprocessors disclosed?',
    answer: 'Yes. A public provider list describes purpose, data categories and region boundaries. Actual enabled providers must be confirmed for the deployed environment.',
    status: 'implemented',
    evidence: ['/subprocessors', '/trust/procurement-pack'],
  },
  {
    id: 'TEST-01',
    category: 'operations',
    question: 'Has an independent penetration test been completed?',
    answer: 'No completed independent penetration test is claimed unless a dated report and remediation evidence are available for the relevant release.',
    status: 'evidence-required',
    evidence: ['/security'],
  },
];

export function getSecurityQuestionnairePack(now = new Date()): SecurityQuestionnairePack {
  return {
    product: 'RISCK COMPLY',
    version: '2026-07',
    generatedAt: now.toISOString(),
    disclosure: 'Public due-diligence answers only. No tenant data, customer evidence, secrets or contractual commitments are included.',
    answers: answers.map((answer) => ({ ...answer, evidence: [...answer.evidence] })),
  };
}

export function resolveEvidenceUrls(origin: string, pack: SecurityQuestionnairePack): SecurityQuestionnairePack {
  const safeOrigin = new URL(origin).origin;
  return {
    ...pack,
    answers: pack.answers.map((answer) => ({
      ...answer,
      evidence: answer.evidence.map((path) => new URL(path, safeOrigin).toString()),
    })),
  };
}
