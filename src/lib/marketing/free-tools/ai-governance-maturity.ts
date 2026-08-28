export type MaturityAnswer = 0 | 1 | 2 | 3;

export type MaturityDimension = {
  id: string;
  name: string;
  prompt: string;
  nextAction: string;
};

export const AI_GOVERNANCE_MATURITY_DIMENSIONS: MaturityDimension[] = [
  { id: 'governance-model', name: 'Governance model', prompt: 'How consistently are AI governance roles, decision rights and escalation paths defined?', nextAction: 'Define accountable roles, decision rights and escalation paths for AI governance.' },
  { id: 'inventory', name: 'AI inventory', prompt: 'How complete and current is your inventory of AI systems, use cases, owners and vendors?', nextAction: 'Create a living inventory with ownership and recurring review dates.' },
  { id: 'risk-decisions', name: 'Risk and decisions', prompt: 'How repeatable is your review of intended use, risk, obligations, approvals and exceptions?', nextAction: 'Introduce a repeatable review with human sign-off and retained decision evidence.' },
  { id: 'evidence', name: 'Evidence readiness', prompt: 'How reliably can your team produce dated evidence of policies, reviews, decisions and actions?', nextAction: 'Connect governance actions to dated evidence rather than relying on scattered documents.' },
  { id: 'vendor-governance', name: 'Vendor AI governance', prompt: 'How consistently are material AI vendors reviewed, documented and revisited?', nextAction: 'Establish a risk-based vendor AI review with evidence, ownership and review cadence.' },
  { id: 'monitoring', name: 'Monitoring and improvement', prompt: 'How consistently do you monitor changes, overdue actions, incidents and governance effectiveness?', nextAction: 'Define recurring governance reviews and a small set of meaningful operating metrics.' },
];

export type MaturityResult = {
  score: number;
  level: 'Ad hoc' | 'Emerging' | 'Managed' | 'Operational';
  priorities: Array<MaturityDimension & { answer: MaturityAnswer }>;
};

export function scoreAiGovernanceMaturity(answers: Partial<Record<string, MaturityAnswer>>): MaturityResult {
  const scored = AI_GOVERNANCE_MATURITY_DIMENSIONS.flatMap((dimension) => {
    const answer = answers[dimension.id];
    return answer === 0 || answer === 1 || answer === 2 || answer === 3 ? [{ ...dimension, answer }] : [];
  });
  const points = scored.reduce((total, item) => total + item.answer, 0);
  const maximum = AI_GOVERNANCE_MATURITY_DIMENSIONS.length * 3;
  const score = Math.round((points / maximum) * 100);
  const level = score < 30 ? 'Ad hoc' : score < 55 ? 'Emerging' : score < 80 ? 'Managed' : 'Operational';
  const priorities = [...scored]
    .filter((item) => item.answer < 3)
    .sort((a, b) => a.answer - b.answer || AI_GOVERNANCE_MATURITY_DIMENSIONS.findIndex((d) => d.id === a.id) - AI_GOVERNANCE_MATURITY_DIMENSIONS.findIndex((d) => d.id === b.id))
    .slice(0, 3);
  return { score, level, priorities };
}
