import { describe, expect, it } from 'vitest';
import { resolveArticle50EffectiveDate } from './article-50-effective-dates';

describe('Article 50 effective-date resolver', () => {
  it('fails closed to 2 August 2026 when the final amendment is not verified', () => {
    const decision = resolveArticle50EffectiveDate({
      obligation: 'article_50_2_machine_readable_marking',
      systemPlacedOnMarketBefore2026_08_02: true,
      finalAmendingActVerifiedInOfficialJournal: false,
    });

    expect(decision.appliesFrom).toBe('2026-08-02');
    expect(decision.transitionEndsAt).toBeNull();
    expect(decision.transitionStatus).toBe('proposal_not_effective');
  });

  it('allows the limited transition only after Official Journal verification', () => {
    const decision = resolveArticle50EffectiveDate({
      obligation: 'article_50_2_machine_readable_marking',
      systemPlacedOnMarketBefore2026_08_02: true,
      finalAmendingActVerifiedInOfficialJournal: true,
    });

    expect(decision.transitionEndsAt).toBe('2026-12-02');
    expect(decision.transitionStatus).toBe('officially_adopted');
    expect(decision.qualifyingCondition).toContain('before 2026-08-02');
  });

  it('does not extend the transition to new systems', () => {
    const decision = resolveArticle50EffectiveDate({
      obligation: 'article_50_2_machine_readable_marking',
      systemPlacedOnMarketBefore2026_08_02: false,
      finalAmendingActVerifiedInOfficialJournal: true,
    });

    expect(decision.transitionEndsAt).toBeNull();
    expect(decision.transitionStatus).toBe('base_rule');
  });

  it('never applies the marking transition to Article 50(4) deployer disclosures', () => {
    const decision = resolveArticle50EffectiveDate({
      obligation: 'article_50_4_deployer_disclosure',
      systemPlacedOnMarketBefore2026_08_02: true,
      finalAmendingActVerifiedInOfficialJournal: true,
    });

    expect(decision.appliesFrom).toBe('2026-08-02');
    expect(decision.transitionEndsAt).toBeNull();
    expect(decision.transitionStatus).toBe('base_rule');
  });
});
