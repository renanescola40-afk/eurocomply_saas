import { describe, expect, it } from 'vitest';
import {
  calculateTimeToValue,
  classifyRegulatoryImpact,
  deduplicateFrameworkMappings,
  evaluateEvidence,
} from '../market-leadership-foundations';

const digest = `sha256:${'a'.repeat(64)}`;

describe('market leadership governance foundations', () => {
  it('rejects synthetic production evidence and preserves the truth boundary', () => {
    const decision = evaluateEvidence(
      {
        environment: 'production',
        evidenceClass: 'synthetic',
        integrityDigest: digest,
        sourceReference: 'workflow:123',
        collectedAt: new Date('2026-07-28T10:00:00Z'),
        validFrom: new Date('2026-07-28T09:00:00Z'),
        validUntil: new Date('2026-08-28T09:00:00Z'),
        limitations: 'Synthetic fixture only.',
        reviewStatus: 'accepted',
      },
      new Date('2026-07-28T12:00:00Z'),
    );

    expect(decision.productionProof).toBe(false);
    expect(decision.accepted).toBe(false);
    expect(decision.reasons).toContain('synthetic_cannot_be_production_proof');
  });

  it('accepts current integrity-bound customer evidence', () => {
    const decision = evaluateEvidence(
      {
        environment: 'production',
        evidenceClass: 'customer',
        integrityDigest: digest,
        sourceReference: 'event:evt_123',
        collectedAt: new Date('2026-07-28T10:00:00Z'),
        validFrom: new Date('2026-07-28T09:00:00Z'),
        validUntil: new Date('2026-08-28T09:00:00Z'),
        limitations: 'Proves only the observed event and organization.',
        reviewStatus: 'accepted',
      },
      new Date('2026-07-28T12:00:00Z'),
    );

    expect(decision).toEqual({
      reusable: true,
      current: true,
      productionProof: true,
      accepted: true,
      reasons: [],
    });
  });

  it.each(['unreviewed', 'review_required', 'rejected'] as const)(
    'does not treat %s production evidence as production proof',
    (reviewStatus) => {
      const decision = evaluateEvidence(
        {
          environment: 'production',
          evidenceClass: 'provider',
          integrityDigest: digest,
          sourceReference: 'provider:run-123',
          collectedAt: new Date('2026-07-28T10:00:00Z'),
          validFrom: new Date('2026-07-28T09:00:00Z'),
          validUntil: new Date('2026-08-28T09:00:00Z'),
          limitations: 'Provider evidence pending an accepted review.',
          reviewStatus,
        },
        new Date('2026-07-28T12:00:00Z'),
      );

      expect(decision.accepted).toBe(false);
      expect(decision.productionProof).toBe(false);
      expect(decision.reusable).toBe(false);
    },
  );

  it('rejects evidence before its validity window and with a future collection time', () => {
    const decision = evaluateEvidence(
      {
        environment: 'production',
        evidenceClass: 'provider',
        integrityDigest: digest,
        sourceReference: 'provider:future-run',
        collectedAt: new Date('2026-07-30T10:00:00Z'),
        validFrom: new Date('2026-07-30T09:00:00Z'),
        validUntil: new Date('2026-08-30T09:00:00Z'),
        limitations: 'Not valid at the evaluation instant.',
        reviewStatus: 'accepted',
      },
      new Date('2026-07-28T12:00:00Z'),
    );

    expect(decision.current).toBe(false);
    expect(decision.accepted).toBe(false);
    expect(decision.productionProof).toBe(false);
    expect(decision.reusable).toBe(false);
    expect(decision.reasons).toEqual(
      expect.arrayContaining(['not_yet_valid', 'collected_in_future']),
    );
  });

  it('does not promote expired accepted production evidence', () => {
    const decision = evaluateEvidence(
      {
        environment: 'production',
        evidenceClass: 'customer',
        integrityDigest: digest,
        sourceReference: 'event:expired',
        collectedAt: new Date('2026-07-20T10:00:00Z'),
        validFrom: new Date('2026-07-20T09:00:00Z'),
        validUntil: new Date('2026-07-27T09:00:00Z'),
        limitations: 'Expired before the evaluation instant.',
        reviewStatus: 'accepted',
      },
      new Date('2026-07-28T12:00:00Z'),
    );

    expect(decision.current).toBe(false);
    expect(decision.productionProof).toBe(false);
    expect(decision.reasons).toContain('expired');
  });

  it('fails regulatory changes closed when source or scope is unresolved', () => {
    const decision = classifyRegulatoryImpact({
      bindingStatus: 'draft',
      effectiveAt: new Date('2026-08-01T00:00:00Z'),
      sourceVerifiedAt: null,
      affectedEntityIds: [],
      affectedControlIds: [],
    });

    expect(decision.status).toBe('review_required');
    expect(decision.requiresHumanReview).toBe(true);
    expect(decision.reasons).toEqual(
      expect.arrayContaining([
        'non_binding_or_unknown_source',
        'source_not_verified',
        'impact_scope_not_resolved',
      ]),
    );
  });

  it('marks verified changes with affected scope as action required', () => {
    const decision = classifyRegulatoryImpact({
      bindingStatus: 'binding',
      effectiveAt: new Date('2026-12-01T00:00:00Z'),
      sourceVerifiedAt: new Date('2026-07-28T00:00:00Z'),
      affectedEntityIds: ['entity-1'],
      affectedControlIds: ['control-1'],
    });

    expect(decision.status).toBe('action_required');
    expect(decision.requiresHumanReview).toBe(false);
  });

  it('measures onboarding value without turning progress into legal readiness', () => {
    const start = new Date('2026-07-28T09:00:00Z');
    const summary = calculateTimeToValue(start, [
      { eventName: 'first_inventory_created', occurredAt: new Date('2026-07-28T09:08:00Z') },
      { eventName: 'first_classification_completed', occurredAt: new Date('2026-07-28T09:14:00Z') },
      { eventName: 'first_evidence_accepted', occurredAt: new Date('2026-07-28T09:28:00Z') },
      { eventName: 'first_report_exported', occurredAt: new Date('2026-07-28T10:00:00Z') },
    ]);

    expect(summary).toEqual({
      firstInventoryMinutes: 8,
      firstClassificationMinutes: 14,
      firstEvidenceMinutes: 28,
      firstReportMinutes: 60,
      activated: true,
    });
  });

  it('deduplicates framework mappings without merging different versions', () => {
    const mappings = deduplicateFrameworkMappings([
      {
        frameworkKey: 'EU-AI-ACT',
        frameworkVersion: '2024/1689',
        requirementKey: 'ARTICLE-9',
        mappingStrength: 'full',
        rationale: 'Risk management system.',
      },
      {
        frameworkKey: 'eu-ai-act',
        frameworkVersion: '2024/1689',
        requirementKey: 'article-9',
        mappingStrength: 'partial',
        rationale: 'Duplicate should not replace first mapping.',
      },
      {
        frameworkKey: 'ISO-42001',
        frameworkVersion: '2023',
        requirementKey: '6.1',
        mappingStrength: 'substantial',
        rationale: 'AI management risk planning.',
      },
    ]);

    expect(mappings).toHaveLength(2);
    expect(mappings[0]?.mappingStrength).toBe('full');
  });
});
