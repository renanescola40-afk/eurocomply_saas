import { resolveArticle50EffectiveDate } from '@/server/ai-governance/article-50-effective-dates';

export type Article50DeadlineView = {
  obligation: 'article_50_2_machine_readable_marking' | 'article_50_4_deployer_disclosure';
  bindingDate: string;
  transitionEnd: string | null;
  legalStatus: 'binding_base_rule' | 'proposal_not_effective' | 'verified_transition';
  customerLabel: string;
  warning: string | null;
};

export function getArticle50DeadlineView(input: {
  obligation: Article50DeadlineView['obligation'];
  systemPlacedOnMarketBefore2026_08_02: boolean;
  finalAmendingActVerifiedInOfficialJournal: boolean;
}): Article50DeadlineView {
  const decision = resolveArticle50EffectiveDate(input);
  const legalStatus =
    decision.transitionStatus === 'officially_adopted'
      ? 'verified_transition'
      : decision.transitionStatus === 'proposal_not_effective'
        ? 'proposal_not_effective'
        : 'binding_base_rule';

  return {
    obligation: input.obligation,
    bindingDate: decision.appliesFrom,
    transitionEnd: decision.transitionEndsAt,
    legalStatus,
    customerLabel:
      decision.transitionEndsAt === null
        ? `Obrigação aplicável a partir de ${decision.appliesFrom}.`
        : `Data-base ${decision.appliesFrom}; transição verificada até ${decision.transitionEndsAt} apenas para sistemas elegíveis.`,
    warning:
      legalStatus === 'proposal_not_effective'
        ? 'Existe uma proposta de transição, mas ela não é apresentada como lei vigente sem prova do ato final no Jornal Oficial.'
        : null,
  };
}
