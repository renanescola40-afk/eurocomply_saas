export type Article50TransitionStatus =
  | 'base_rule'
  | 'proposal_not_effective'
  | 'officially_adopted';

export type Article50EffectiveDateDecision = {
  obligation: 'article_50_2_machine_readable_marking' | 'article_50_4_deployer_disclosure';
  appliesFrom: string;
  transitionEndsAt: string | null;
  transitionStatus: Article50TransitionStatus;
  qualifyingCondition: string | null;
  source: {
    authority: 'eur_lex' | 'european_commission';
    title: string;
    url: string;
    verifiedAt: string;
  };
  limitations: string[];
};

const ARTICLE_50_BASE_DATE = '2026-08-02';
const PROPOSED_PRE_EXISTING_SYSTEM_TRANSITION_END = '2026-12-02';

const EUR_LEX_AI_ACT = 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj?locale=en';
const COMMISSION_ARTICLE_50_GUIDANCE =
  'https://digital-strategy.ec.europa.eu/en/library/guidelines-transparency-obligations-providers-and-deployers-ai-systems';
const COMMISSION_CODE_FAQ =
  'https://digital-strategy.ec.europa.eu/en/faqs/signing-code-practice-transparency-ai-generated-content';

/**
 * Resolves Article 50 dates without treating a political agreement or proposal
 * as binding law. The optional transition is enabled only after an operator has
 * recorded verification of the final amending act in the Official Journal.
 */
export function resolveArticle50EffectiveDate(input: {
  obligation: Article50EffectiveDateDecision['obligation'];
  systemPlacedOnMarketBefore2026_08_02: boolean;
  finalAmendingActVerifiedInOfficialJournal: boolean;
  verifiedAt?: string;
}): Article50EffectiveDateDecision {
  const verifiedAt = input.verifiedAt ?? '2026-07-27';

  if (input.obligation === 'article_50_4_deployer_disclosure') {
    return {
      obligation: input.obligation,
      appliesFrom: ARTICLE_50_BASE_DATE,
      transitionEndsAt: null,
      transitionStatus: 'base_rule',
      qualifyingCondition: null,
      source: {
        authority: 'european_commission',
        title: 'Guidelines on transparency obligations for providers and deployers of AI systems',
        url: COMMISSION_ARTICLE_50_GUIDANCE,
        verifiedAt,
      },
      limitations: [
        'No general grace period is applied to Article 50(4) deployer disclosure duties.',
        'Role-specific exceptions and the facts of each use case still require assessment.',
      ],
    };
  }

  const qualifiesForTransition =
    input.systemPlacedOnMarketBefore2026_08_02 &&
    input.finalAmendingActVerifiedInOfficialJournal;

  if (qualifiesForTransition) {
    return {
      obligation: input.obligation,
      appliesFrom: ARTICLE_50_BASE_DATE,
      transitionEndsAt: PROPOSED_PRE_EXISTING_SYSTEM_TRANSITION_END,
      transitionStatus: 'officially_adopted',
      qualifyingCondition: 'System placed on the market or put into service before 2026-08-02.',
      source: {
        authority: 'eur_lex',
        title: 'Final AI Act amending regulation verified in the Official Journal',
        url: EUR_LEX_AI_ACT,
        verifiedAt,
      },
      limitations: [
        'The transition is limited to qualifying pre-existing systems and Article 50(2) marking/detection duties.',
        'The final amending act and its entry-into-force provisions must be retained as evidence.',
      ],
    };
  }

  return {
    obligation: input.obligation,
    appliesFrom: ARTICLE_50_BASE_DATE,
    transitionEndsAt: null,
    transitionStatus: input.systemPlacedOnMarketBefore2026_08_02
      ? 'proposal_not_effective'
      : 'base_rule',
    qualifyingCondition: null,
    source: {
      authority: 'european_commission',
      title: 'Signing the Code of Practice on Transparency of AI-generated Content — transition proposal notice',
      url: COMMISSION_CODE_FAQ,
      verifiedAt,
    },
    limitations: [
      'A proposal, political agreement, FAQ or code of practice does not by itself amend the Regulation.',
      'Until the final amending act is verified in the Official Journal, the product must fail closed to 2026-08-02.',
    ],
  };
}
