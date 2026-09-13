export const SOLUTION_KEYS = [
  'eu-ai-act-compliance-software',
  'ai-governance-platform',
  'ai-inventory-software',
] as const;

export type SolutionKey = (typeof SOLUTION_KEYS)[number];

type SolutionFaq = {
  question: string;
  answer: string;
};

type SolutionSource = {
  label: string;
  href: string;
};

export type SolutionPage = {
  key: SolutionKey;
  title: string;
  metaTitle: string;
  description: string;
  eyebrow: string;
  intro: string;
  answer: string;
  problemTitle: string;
  problem: string;
  capabilitiesTitle: string;
  capabilities: string[];
  workflowTitle: string;
  workflow: string[];
  evidenceTitle: string;
  evidence: string[];
  faq: SolutionFaq[];
  sources: SolutionSource[];
  relatedFeatures: Array<{ label: string; href: string }>;
};

const pages: Record<SolutionKey, SolutionPage> = {
  'eu-ai-act-compliance-software': {
    key: 'eu-ai-act-compliance-software',
    title: 'EU AI Act compliance software for operational governance',
    metaTitle: 'EU AI Act Compliance Software | RISCK COMPLY',
    description:
      'Organize AI inventory, role and risk reviews, evidence, ownership, vendor governance and audit trails in one EU AI Act readiness workspace.',
    eyebrow: 'EU AI Act compliance software',
    intro:
      'RISCK COMPLY gives compliance, risk and legal teams one controlled workspace for the operational work behind AI Act readiness: knowing which AI systems exist, who owns them, what decisions were made, what evidence supports those decisions and what still needs review.',
    answer:
      'EU AI Act compliance software should help an organization turn regulatory questions into controlled operating work: inventory, applicability and role facts, risk review, assigned ownership, evidence, approvals, monitoring and traceable records. Software can support that process, but it cannot replace qualified legal interpretation or guarantee compliance.',
    problemTitle: 'The hard part is not reading the regulation. It is maintaining evidence over time.',
    problem:
      'AI governance work is often split across spreadsheets, policy documents, ticketing systems, vendor questionnaires and individual inboxes. That makes it difficult to show which system was reviewed, which facts were considered, who approved the decision and whether the evidence is still current.',
    capabilitiesTitle: 'What RISCK COMPLY brings into one operating layer',
    capabilities: [
      'AI system inventory with accountable ownership',
      'Structured risk and readiness assessments',
      'Provider/deployer and applicability fact gathering',
      'Evidence and compliance-document workflows',
      'Vendor AI risk and procurement governance',
      'Approvals, audit trails and review history',
      'Transparency and monitoring workflows',
      'Controlled exports for internal and external review preparation',
    ],
    workflowTitle: 'A practical operating flow',
    workflow: [
      'Register the AI system and its business purpose.',
      'Record role, provider, deployment and risk-relevant facts.',
      'Run the applicable governance and readiness reviews.',
      'Assign owners, actions and approvals instead of leaving findings in a report.',
      'Attach evidence and preserve the decision trail.',
      'Revisit the record as the system, use case or regulatory guidance changes.',
    ],
    evidenceTitle: 'Designed around evidence, not a self-issued compliance badge',
    evidence: [
      'Who owns the system and the decision',
      'What facts and inputs were assessed',
      'Which actions remain open',
      'Which evidence supports the current state',
      'When the record was last reviewed',
      'What changed between reviews',
    ],
    faq: [
      {
        question: 'What is EU AI Act compliance software?',
        answer:
          'It is software used to organize the governance work required to understand and manage AI Act obligations, such as AI inventory, role and risk reviews, evidence, ownership, approvals, monitoring and audit-ready records. The exact legal duties still depend on the organization, system, role and facts.',
      },
      {
        question: 'Does RISCK COMPLY guarantee EU AI Act compliance?',
        answer:
          'No. RISCK COMPLY supports governance operations, evidence preparation and structured readiness work. It does not provide legal advice, certify an organization or guarantee a legal outcome.',
      },
      {
        question: 'Can RISCK COMPLY be used by companies outside the European Union?',
        answer:
          'Yes. Organizations outside the EU can use the platform when they need structured AI governance or when their activities, products, customers or AI value chain create EU-facing governance requirements. Applicability should be assessed on the actual facts.',
      },
      {
        question: 'What is the difference between a checklist and an operational compliance platform?',
        answer:
          'A checklist captures a point-in-time answer. An operational platform also preserves ownership, evidence, approvals, history, vendor context and recurring review so the governance record can evolve with the AI system.',
      },
    ],
    sources: [
      { label: 'EU AI Act — Regulation (EU) 2024/1689 on EUR-Lex', href: 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj' },
      { label: 'European Commission — AI Act Service Desk', href: 'https://ai-act-service-desk.ec.europa.eu/en' },
    ],
    relatedFeatures: [
      { label: 'EU AI Act readiness', href: '/en/features/eu-ai-act-readiness' },
      { label: 'AI risk assessment', href: '/en/features/ai-risk-assessment' },
      { label: 'Evidence management', href: '/en/features/evidence-management' },
      { label: 'Compliance documentation', href: '/en/features/compliance-documentation' },
    ],
  },
  'ai-governance-platform': {
    key: 'ai-governance-platform',
    title: 'AI governance platform for enterprise operating control',
    metaTitle: 'AI Governance Platform for Europe | RISCK COMPLY',
    description:
      'Create an enterprise AI governance system of record for inventory, ownership, risk decisions, evidence, vendors, approvals and monitoring.',
    eyebrow: 'Enterprise AI governance platform',
    intro:
      'RISCK COMPLY helps organizations move AI governance out of disconnected spreadsheets and into a shared operating system where AI systems, owners, evidence, risk decisions, vendor context and review history stay connected.',
    answer:
      'An AI governance platform is a system of record for how an organization identifies, owns, reviews and monitors AI. The most useful platforms connect inventory, accountability, risk decisions, evidence, vendor governance, approvals and audit history rather than treating governance as a one-time policy exercise.',
    problemTitle: 'AI governance breaks when accountability is scattered.',
    problem:
      'Enterprise teams may have security reviewing vendors, legal interpreting obligations, compliance maintaining controls, procurement onboarding providers and business teams deploying AI. Without a shared record, each function can hold a different version of the truth.',
    capabilitiesTitle: 'A shared governance operating model',
    capabilities: [
      'Central AI inventory and system ownership',
      'Risk and readiness assessments',
      'RACI-style accountability and approvals',
      'Evidence collection and audit trails',
      'Vendor AI governance and due-diligence context',
      'Governance documentation workflows',
      'Monitoring and regulatory-update workflows',
      'Workspace roles for controlled collaboration',
    ],
    workflowTitle: 'From AI discovery to governed operation',
    workflow: [
      'Identify AI systems and use cases across the organization.',
      'Assign an accountable owner and relevant stakeholders.',
      'Capture risk, role, vendor and deployment context.',
      'Route findings into actions, evidence and approvals.',
      'Maintain an auditable record of governance decisions.',
      'Review changes instead of restarting governance from zero.',
    ],
    evidenceTitle: 'The governance record should answer basic enterprise questions quickly',
    evidence: [
      'Which AI systems are in use?',
      'Who is accountable for each system?',
      'What risk and regulatory reviews were completed?',
      'What evidence supports each decision?',
      'Which third parties are involved?',
      'Which actions and approvals remain outstanding?',
    ],
    faq: [
      {
        question: 'What is an AI governance platform?',
        answer:
          'An AI governance platform is software that centralizes the records, workflows and evidence used to manage AI across an organization. Typical functions include AI inventory, ownership, risk review, approvals, evidence, vendor governance, monitoring and audit history.',
      },
      {
        question: 'Who normally uses an AI governance platform?',
        answer:
          'Common users include compliance, risk, legal, security, procurement, data and AI teams, internal audit and business owners responsible for AI-enabled processes.',
      },
      {
        question: 'Is AI governance only an EU AI Act requirement?',
        answer:
          'No. Organizations use AI governance to manage operational, security, vendor, accountability and assurance risks even when a specific EU AI Act obligation is not the only driver.',
      },
      {
        question: 'How is RISCK COMPLY different from storing policies in a document repository?',
        answer:
          'A document repository stores files. RISCK COMPLY connects system inventory, owners, assessments, evidence, approvals, vendor context and review history so the governance state can be operated and revisited.',
      },
    ],
    sources: [
      { label: 'European Commission — AI Act governance and enforcement', href: 'https://digital-strategy.ec.europa.eu/en/policies/ai-act-governance-and-enforcement' },
      { label: 'EU AI Act — Regulation (EU) 2024/1689 on EUR-Lex', href: 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj' },
    ],
    relatedFeatures: [
      { label: 'AI governance workflows', href: '/en/features/ai-governance-workflows' },
      { label: 'Audit trails', href: '/en/features/audit-trails' },
      { label: 'Vendor AI risk', href: '/en/features/vendor-ai-risk' },
      { label: 'Evidence management', href: '/en/features/evidence-management' },
    ],
  },
  'ai-inventory-software': {
    key: 'ai-inventory-software',
    title: 'AI inventory software for accountable enterprise AI',
    metaTitle: 'AI Inventory Software for EU AI Governance | RISCK COMPLY',
    description:
      'Build a governed AI system inventory with owners, use cases, providers, risk context, evidence and review history instead of another static spreadsheet.',
    eyebrow: 'AI inventory software',
    intro:
      'RISCK COMPLY turns an AI register into an operational governance record. Teams can connect each AI system to its purpose, owner, provider context, assessments, evidence, actions and review history.',
    answer:
      'AI inventory software is used to maintain a structured register of AI systems and use cases across an organization. A governance-ready inventory goes beyond a name and description: it should make ownership, purpose, providers, deployment context, review status, risk decisions and supporting evidence easy to find and maintain.',
    problemTitle: 'A spreadsheet can list AI. It struggles to govern what happens next.',
    problem:
      'Inventories become stale when ownership, vendor changes, assessments and evidence live somewhere else. The result is a register that looks complete but cannot explain the current governance state of a system.',
    capabilitiesTitle: 'Turn the AI register into a living system of record',
    capabilities: [
      'AI system and use-case registration',
      'Named owner and organizational context',
      'Provider and vendor relationships',
      'Risk and readiness assessment linkage',
      'Evidence and document attachment',
      'Action and approval workflows',
      'Audit history and review timestamps',
      'Portfolio-level visibility across systems',
    ],
    workflowTitle: 'A maintainable AI inventory workflow',
    workflow: [
      'Register the system, use case and business purpose.',
      'Record owner, provider and deployment context.',
      'Link the relevant risk and governance reviews.',
      'Attach evidence and assign follow-up actions.',
      'Record approvals and material decisions.',
      'Update the record when the system or use case changes.',
    ],
    evidenceTitle: 'Useful inventory fields should support decisions, not just counting',
    evidence: [
      'Business purpose and organizational use',
      'Accountable owner',
      'System or model provider',
      'Deployment and user context',
      'Risk and regulatory review state',
      'Evidence, actions and decision history',
    ],
    faq: [
      {
        question: 'What is an AI inventory?',
        answer:
          'An AI inventory is a structured register of AI systems and use cases used by an organization. It helps teams know what AI exists, why it is used, who owns it, which providers are involved and what governance work has been completed.',
      },
      {
        question: 'What should an enterprise AI inventory include?',
        answer:
          'Useful fields commonly include the use case, business purpose, accountable owner, provider, deployment context, affected process, review status, risk decisions, evidence and change history. The right fields depend on the organization and use case.',
      },
      {
        question: 'Why use AI inventory software instead of a spreadsheet?',
        answer:
          'A spreadsheet can be a starting point. Dedicated software becomes useful when the inventory needs role-based collaboration, linked assessments, evidence, approvals, audit history, vendor context and recurring review.',
      },
      {
        question: 'Does every AI system have the same EU AI Act obligations?',
        answer:
          'No. Obligations depend on factors including the system, use, risk classification, role in the AI value chain and other facts. An inventory helps collect those facts but does not replace legal analysis.',
      },
    ],
    sources: [
      { label: 'European Commission — AI Act Service Desk Compliance Checker', href: 'https://ai-act-service-desk.ec.europa.eu/en/eu-ai-act-compliance-checker' },
      { label: 'EU AI Act — Regulation (EU) 2024/1689 on EUR-Lex', href: 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj' },
    ],
    relatedFeatures: [
      { label: 'AI inventory', href: '/en/features/ai-inventory' },
      { label: 'AI risk assessment', href: '/en/features/ai-risk-assessment' },
      { label: 'Vendor AI risk', href: '/en/features/vendor-ai-risk' },
      { label: 'Audit trails', href: '/en/features/audit-trails' },
    ],
  },
};

export function getSolutionPages() {
  return SOLUTION_KEYS.map((key) => pages[key]);
}

export function getSolutionPage(slug: string) {
  return pages[slug as SolutionKey] ?? null;
}

export function getSolutionPath(key: SolutionKey) {
  return `/en/solutions/${key}`;
}
