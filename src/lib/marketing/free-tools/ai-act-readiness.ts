export type ReadinessAnswer = 0 | 1 | 2;

export type ReadinessQuestion = {
  id: string;
  dimension: string;
  prompt: string;
  guidance: string;
  action: string;
};

export type ReadinessResult = {
  score: number;
  level: 'Foundation needed' | 'Developing' | 'Operationalizing' | 'Stronger readiness baseline';
  answered: number;
  total: number;
  priorities: Array<ReadinessQuestion & { answer: ReadinessAnswer }>;
};

export const AI_ACT_READINESS_QUESTIONS: ReadinessQuestion[] = [
  {
    id: 'inventory',
    dimension: 'AI inventory',
    prompt: 'Do you maintain a living inventory of AI systems and material AI use cases?',
    guidance: 'Include business owner, purpose, vendor/model and status so governance starts from a controlled system of record.',
    action: 'Create a living AI inventory with accountable owners and a review cadence.',
  },
  {
    id: 'ownership',
    dimension: 'Ownership and accountability',
    prompt: 'Are accountable business and governance owners assigned for material AI use cases?',
    guidance: 'Ownership should make review, escalation and evidence responsibilities clear rather than leaving AI governance with an undefined team.',
    action: 'Assign accountable owners and document who reviews, approves and monitors each material use case.',
  },
  {
    id: 'role-mapping',
    dimension: 'Provider / deployer role mapping',
    prompt: 'Do you record your role and relevant counterparties for each material AI system or use case?',
    guidance: 'Provider and deployer obligations are context-specific. A recorded role hypothesis helps route the right legal and operational review.',
    action: 'Record provider/deployer role hypotheses and escalate ambiguous cases for qualified legal review.',
  },
  {
    id: 'risk-review',
    dimension: 'Risk and applicability review',
    prompt: 'Is there a repeatable review for risk, intended use, affected people and applicable AI Act duties?',
    guidance: 'A repeatable review should capture facts and evidence without pretending that an automated score is a legal classification.',
    action: 'Introduce a documented risk and applicability review with evidence and human sign-off.',
  },
  {
    id: 'transparency',
    dimension: 'Transparency readiness',
    prompt: 'Have you reviewed whether Article 50 transparency duties are relevant to your AI interactions or generated content?',
    guidance: 'Article 50 applies to certain systems and uses; it is not a blanket instruction to label every use of AI.',
    action: 'Map potentially relevant Article 50 scenarios and document the transparency measure, owner and evidence for each.',
  },
  {
    id: 'oversight-documentation',
    dimension: 'Human oversight and documentation',
    prompt: 'Are human review points, policies and key operating instructions documented for material AI use cases?',
    guidance: 'Operational controls should be visible to the people expected to review, operate and challenge the system.',
    action: 'Document human review points, operating rules and escalation paths for material AI use cases.',
  },
  {
    id: 'vendor-governance',
    dimension: 'Vendor AI governance',
    prompt: 'Do procurement or governance teams review material AI vendors and retain the evidence needed for follow-up?',
    guidance: 'Vendor governance can connect technical, privacy, security, contractual and AI-specific evidence instead of treating each review as a one-off inbox exercise.',
    action: 'Create a repeatable AI vendor review and retain decisions, evidence, owners and review dates.',
  },
  {
    id: 'evidence-monitoring',
    dimension: 'Evidence, monitoring and review',
    prompt: 'Can you show dated evidence of decisions, actions, changes and recurring governance reviews?',
    guidance: 'A review-ready operating record is stronger than a one-time policy document that becomes stale.',
    action: 'Establish recurring review dates and retain dated evidence of decisions, actions and changes.',
  },
];

function readinessLevel(score: number): ReadinessResult['level'] {
  if (score <= 34) return 'Foundation needed';
  if (score <= 64) return 'Developing';
  if (score <= 84) return 'Operationalizing';
  return 'Stronger readiness baseline';
}

export function scoreAiActReadiness(answers: Partial<Record<string, ReadinessAnswer>>): ReadinessResult {
  const scored = AI_ACT_READINESS_QUESTIONS.flatMap((question) => {
    const answer = answers[question.id];
    return answer === 0 || answer === 1 || answer === 2 ? [{ ...question, answer }] : [];
  });

  const points = scored.reduce((total, item) => total + item.answer, 0);
  const maximum = AI_ACT_READINESS_QUESTIONS.length * 2;
  const score = Math.round((points / maximum) * 100);
  const priorities = [...scored]
    .filter((item) => item.answer < 2)
    .sort((a, b) => a.answer - b.answer || AI_ACT_READINESS_QUESTIONS.findIndex((q) => q.id === a.id) - AI_ACT_READINESS_QUESTIONS.findIndex((q) => q.id === b.id))
    .slice(0, 3);

  return {
    score,
    level: readinessLevel(score),
    answered: scored.length,
    total: AI_ACT_READINESS_QUESTIONS.length,
    priorities,
  };
}

export function buildReadinessShareText(result: ReadinessResult) {
  const priorityText = result.priorities.length
    ? ` Priority areas: ${result.priorities.map((item) => item.dimension).join(', ')}.`
    : '';

  return `RISCK COMPLY AI Governance Readiness: ${result.score}/100 — ${result.level}.${priorityText} Indicative operational readiness only; not a legal compliance determination.`;
}
