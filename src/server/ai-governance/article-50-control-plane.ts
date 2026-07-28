import {
  resolveArticle50EffectiveDate,
  type Article50EffectiveDateDecision,
} from './article-50-effective-dates';

export type Article50ControlInput = {
  systemId: string;
  systemName: string;
  placedOnMarketAt: string | null;
  providerMachineReadableMarking: boolean;
  deployerDisclosure: boolean;
  finalAmendingActVerifiedInOfficialJournal: boolean;
  officialJournalEvidenceId?: string | null;
  evaluatedAt?: string;
};

export type Article50ControlResult = {
  systemId: string;
  systemName: string;
  status: 'BLOCKED' | 'NEEDS_REVIEW' | 'READY';
  decisions: Article50EffectiveDateDecision[];
  blockers: string[];
  warnings: string[];
  evidenceRequirements: string[];
  evaluatedAt: string;
};

function isBeforeBaseDate(value: string | null): boolean {
  if (!value) return false;
  return value < '2026-08-02';
}

export function evaluateArticle50Control(input: Article50ControlInput): Article50ControlResult {
  const evaluatedAt = input.evaluatedAt ?? new Date().toISOString();
  const preExisting = isBeforeBaseDate(input.placedOnMarketAt);
  const markingDecision = resolveArticle50EffectiveDate({
    obligation: 'article_50_2_machine_readable_marking',
    systemPlacedOnMarketBefore2026_08_02: preExisting,
    finalAmendingActVerifiedInOfficialJournal:
      input.finalAmendingActVerifiedInOfficialJournal,
    verifiedAt: evaluatedAt.slice(0, 10),
  });
  const disclosureDecision = resolveArticle50EffectiveDate({
    obligation: 'article_50_4_deployer_disclosure',
    systemPlacedOnMarketBefore2026_08_02: preExisting,
    finalAmendingActVerifiedInOfficialJournal:
      input.finalAmendingActVerifiedInOfficialJournal,
    verifiedAt: evaluatedAt.slice(0, 10),
  });

  const blockers: string[] = [];
  const warnings: string[] = [];
  const evidenceRequirements = [
    'Retain evidence of when the system was placed on the market or put into service.',
    'Retain the exact disclosure copy, language, channel and proof of display.',
    'Retain machine-readable marking validation where Article 50(2) applies.',
  ];

  if (!input.placedOnMarketAt) {
    warnings.push('Placement date is unknown; transition eligibility cannot be established.');
  }
  if (!input.providerMachineReadableMarking && markingDecision.transitionEndsAt === null) {
    blockers.push('Article 50(2) machine-readable marking is not evidenced for the binding date.');
  }
  if (!input.deployerDisclosure) {
    blockers.push('Article 50(4) human-readable deployer disclosure is not evidenced.');
  }
  if (
    input.finalAmendingActVerifiedInOfficialJournal &&
    !input.officialJournalEvidenceId
  ) {
    blockers.push('Official Journal verification is claimed without a retained evidence identifier.');
  }
  if (markingDecision.transitionStatus === 'proposal_not_effective') {
    warnings.push('A proposed transition exists, but it is not treated as binding law.');
  }

  return {
    systemId: input.systemId,
    systemName: input.systemName,
    status: blockers.length > 0 ? 'BLOCKED' : warnings.length > 0 ? 'NEEDS_REVIEW' : 'READY',
    decisions: [markingDecision, disclosureDecision],
    blockers,
    warnings,
    evidenceRequirements,
    evaluatedAt,
  };
}

export function evaluateArticle50Portfolio(
  systems: Article50ControlInput[],
): {
  results: Article50ControlResult[];
  summary: { total: number; ready: number; needsReview: number; blocked: number };
} {
  const results = systems.map(evaluateArticle50Control);
  return {
    results,
    summary: {
      total: results.length,
      ready: results.filter((item) => item.status === 'READY').length,
      needsReview: results.filter((item) => item.status === 'NEEDS_REVIEW').length,
      blocked: results.filter((item) => item.status === 'BLOCKED').length,
    },
  };
}
