export type RoleSignalAnswer = 'yes' | 'no' | 'unsure';

export type RoleSignalAnswers = {
  developOrCommission?: RoleSignalAnswer;
  ownNameOrTrademark?: RoleSignalAnswer;
  useUnderAuthority?: RoleSignalAnswer;
  thirdPartySystem?: RoleSignalAnswer;
};

export type RoleSignalResult = {
  outcome: 'provider-signals' | 'deployer-signals' | 'mixed-signals' | 'insufficient-facts';
  title: string;
  summary: string;
  nextSteps: string[];
};

export function evaluateProviderDeployerSignals(answers: RoleSignalAnswers): RoleSignalResult {
  const providerSignal = answers.developOrCommission === 'yes' && answers.ownNameOrTrademark === 'yes';
  const deployerSignal = answers.useUnderAuthority === 'yes';
  const uncertainty = Object.values(answers).some((answer) => answer === 'unsure') || Object.keys(answers).length < 4;

  if (providerSignal && deployerSignal) {
    return {
      outcome: 'mixed-signals',
      title: 'Provider and deployer signals are both present',
      summary: 'A single organization can have different roles across systems or activities. Your answers contain signals that should be mapped per AI system and use case rather than collapsed into one organization-wide label.',
      nextSteps: [
        'Create a system-by-system role map and identify which entity places or puts each AI system into service under its own name or trademark.',
        'Record who uses each AI system under whose authority and for what professional purpose.',
        'Escalate mixed or transformed-system scenarios for qualified legal review before relying on the role map.',
      ],
    };
  }

  if (providerSignal) {
    return {
      outcome: 'provider-signals',
      title: 'Provider signals are present',
      summary: 'Developing or having an AI system developed and placing it on the market or putting it into service under your own name or trademark is a core provider signal in Article 3 of the AI Act.',
      nextSteps: [
        'Document the AI system, legal entity, name/trademark and the act of placing it on the market or putting it into service.',
        'Map provider obligations that may apply to that specific system and context using authoritative sources.',
        'Have qualified counsel confirm the role where facts or value-chain responsibilities are ambiguous.',
      ],
    };
  }

  if (deployerSignal) {
    return {
      outcome: 'deployer-signals',
      title: 'Deployer signals are present',
      summary: 'Using an AI system under your organization’s authority for professional activity is a core deployer signal in Article 3 of the AI Act.',
      nextSteps: [
        'Record the organization responsible for the use, business purpose and accountable owner.',
        'Identify the upstream provider and retain the evidence needed for deployer governance and transparency review.',
        'Review use-case-specific deployer duties rather than assuming all AI use carries the same obligations.',
      ],
    };
  }

  return {
    outcome: 'insufficient-facts',
    title: uncertainty ? 'More facts are needed' : 'No clear provider or deployer signal from these answers',
    summary: 'This limited checker does not have enough factual signals to route a provider/deployer role confidently. Other AI Act operator roles and context can also matter.',
    nextSteps: [
      'Identify who developed or commissioned the system, whose name or trademark it is supplied under, and who uses it under whose authority.',
      'Map the specific AI system and use case instead of assigning one permanent role to the whole organization.',
      'Use qualified legal review for ambiguous value-chain or modified-system scenarios.',
    ],
  };
}
