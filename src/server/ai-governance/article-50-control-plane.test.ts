import { describe, expect, it } from 'vitest';
import { evaluateArticle50Control, evaluateArticle50Portfolio } from './article-50-control-plane';

describe('Article 50 operational control plane', () => {
  it('fails closed when a proposed transition has no Official Journal proof', () => {
    const result = evaluateArticle50Control({
      systemId: 'sys-1',
      systemName: 'Legacy generator',
      placedOnMarketAt: '2026-07-01',
      providerMachineReadableMarking: false,
      deployerDisclosure: true,
      finalAmendingActVerifiedInOfficialJournal: false,
      evaluatedAt: '2026-07-28T08:00:00.000Z',
    });

    expect(result.status).toBe('BLOCKED');
    expect(result.decisions[0].transitionStatus).toBe('proposal_not_effective');
    expect(result.decisions[0].transitionEndsAt).toBeNull();
  });

  it('requires retained evidence when an Official Journal transition is claimed', () => {
    const result = evaluateArticle50Control({
      systemId: 'sys-2',
      systemName: 'Existing media model',
      placedOnMarketAt: '2026-07-15',
      providerMachineReadableMarking: false,
      deployerDisclosure: true,
      finalAmendingActVerifiedInOfficialJournal: true,
      officialJournalEvidenceId: null,
      evaluatedAt: '2026-08-03T08:00:00.000Z',
    });

    expect(result.status).toBe('BLOCKED');
    expect(result.blockers).toContain(
      'Official Journal verification is claimed without a retained evidence identifier.',
    );
  });

  it('never applies the provider transition to deployer disclosure', () => {
    const result = evaluateArticle50Control({
      systemId: 'sys-3',
      systemName: 'Synthetic video platform',
      placedOnMarketAt: '2026-06-20',
      providerMachineReadableMarking: false,
      deployerDisclosure: false,
      finalAmendingActVerifiedInOfficialJournal: true,
      officialJournalEvidenceId: 'evidence-oj-1',
      evaluatedAt: '2026-08-03T08:00:00.000Z',
    });

    expect(result.decisions[0].transitionEndsAt).toBe('2026-12-02');
    expect(result.decisions[1].transitionEndsAt).toBeNull();
    expect(result.blockers).toContain(
      'Article 50(4) human-readable deployer disclosure is not evidenced.',
    );
  });

  it('aggregates portfolio state without hiding blocked systems', () => {
    const portfolio = evaluateArticle50Portfolio([
      {
        systemId: 'ready',
        systemName: 'Ready system',
        placedOnMarketAt: '2026-08-05',
        providerMachineReadableMarking: true,
        deployerDisclosure: true,
        finalAmendingActVerifiedInOfficialJournal: false,
        evaluatedAt: '2026-08-05T08:00:00.000Z',
      },
      {
        systemId: 'blocked',
        systemName: 'Blocked system',
        placedOnMarketAt: null,
        providerMachineReadableMarking: false,
        deployerDisclosure: false,
        finalAmendingActVerifiedInOfficialJournal: false,
        evaluatedAt: '2026-08-05T08:00:00.000Z',
      },
    ]);

    expect(portfolio.summary).toEqual({ total: 2, ready: 1, needsReview: 0, blocked: 1 });
  });
});
