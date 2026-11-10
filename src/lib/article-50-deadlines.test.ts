import { describe, expect, it } from 'vitest';
import { getArticle50DeadlineView } from './article-50-deadlines';

describe('Article 50 deadline view', () => {
  it('does not present the in-force amendment as a mere proposal when case evidence is missing', () => {
    const view = getArticle50DeadlineView({
      obligation: 'article_50_2_machine_readable_marking',
      systemPlacedOnMarketBefore2026_08_02: true,
      finalAmendingActVerifiedInOfficialJournal: false,
    });

    expect(view.bindingDate).toBe('2026-08-02');
    expect(view.transitionEnd).toBeNull();
    expect(view.legalStatus).toBe('proposal_not_effective');
    expect(view.warning).toContain('2026/1744 está em vigor');
    expect(view.warning).toContain('ainda não contém prova');
    expect(view.warning).not.toContain('proposta de transição');
  });

  it('does not show a transition for deployer disclosure', () => {
    const view = getArticle50DeadlineView({
      obligation: 'article_50_4_deployer_disclosure',
      systemPlacedOnMarketBefore2026_08_02: true,
      finalAmendingActVerifiedInOfficialJournal: true,
    });

    expect(view.transitionEnd).toBeNull();
    expect(view.legalStatus).toBe('binding_base_rule');
  });
});
