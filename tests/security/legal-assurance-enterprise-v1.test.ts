import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  calculatePackageDelta,
  canTransitionLegalReview,
  createPackageManifestDigest,
  isDecisionCurrent,
  isLegalAssuranceEnabled,
  recommendReviewFromDelta,
  type LegalReviewPackageManifest,
} from '../../src/server/legal-assurance/core';

const migrationPath = 'supabase/migrations/20260901002000_legal_assurance_enterprise_v1.sql';
const migration = readFileSync(migrationPath, 'utf8');

function manifest(items: LegalReviewPackageManifest['items']): LegalReviewPackageManifest {
  return {
    reviewId: 'review-1',
    organizationId: 'org-1',
    aiSystemId: 'system-1',
    productReleaseSha: 'a'.repeat(40),
    methodologyVersion: '2026.09.01',
    regulatoryRulesVersion: '2026.09.01',
    packageVersion: 1,
    createdAt: '2026-09-01T00:00:00.000Z',
    items,
    knownLimitations: ['External counsel validation pending.'],
    openGaps: [],
  };
}

describe('Legal Assurance Enterprise V1', () => {
  it('is server-gated and fail-closed by default', () => {
    expect(isLegalAssuranceEnabled({})).toBe(false);
    expect(isLegalAssuranceEnabled({ LEGAL_ASSURANCE_ENABLED: 'false' })).toBe(false);
    expect(isLegalAssuranceEnabled({ LEGAL_ASSURANCE_ENABLED: 'TRUE' })).toBe(true);
  });

  it('keeps lifecycle transitions deterministic and rejects authority shortcuts', () => {
    expect(canTransitionLegalReview('REQUESTED', 'CONFLICT_CHECK_PENDING')).toBe(true);
    expect(canTransitionLegalReview('CONFLICT_CHECK_PENDING', 'ENGAGEMENT_PENDING')).toBe(true);
    expect(canTransitionLegalReview('ENGAGEMENT_PENDING', 'ACCEPTED_FOR_REVIEW')).toBe(true);
    expect(canTransitionLegalReview('READY_FOR_REVIEW', 'IN_REVIEW')).toBe(true);
    expect(canTransitionLegalReview('REMEDIATION_REQUIRED', 'RESUBMITTED')).toBe(true);
    expect(canTransitionLegalReview('REQUESTED', 'COMPLETED')).toBe(false);
    expect(canTransitionLegalReview('CONFLICT_CHECK_PENDING', 'IN_REVIEW')).toBe(false);
    expect(canTransitionLegalReview('CANCELLED', 'IN_REVIEW')).toBe(false);
  });

  it('creates stable package digests independent of object-key insertion order', () => {
    const item = {
      stableIdentifier: 'fria:assessment:1',
      contentDigest: 'b'.repeat(64),
      sourceVersion: '7',
      capturedAt: '2026-09-01T00:00:00.000Z',
    };
    const left = manifest([item]);
    const right = {
      openGaps: [],
      knownLimitations: ['External counsel validation pending.'],
      items: [item],
      createdAt: '2026-09-01T00:00:00.000Z',
      packageVersion: 1,
      regulatoryRulesVersion: '2026.09.01',
      methodologyVersion: '2026.09.01',
      productReleaseSha: 'a'.repeat(40),
      aiSystemId: 'system-1',
      organizationId: 'org-1',
      reviewId: 'review-1',
    } as LegalReviewPackageManifest;

    expect(createPackageManifestDigest(left)).toBe(createPackageManifestDigest(right));
    expect(createPackageManifestDigest(left)).toMatch(/^[a-f0-9]{64}$/);
  });

  it('classifies immutable package deltas without claiming legal sufficiency', () => {
    const previous = [
      { stableIdentifier: 'same', contentDigest: 'a'.repeat(64) },
      { stableIdentifier: 'changed', contentDigest: 'b'.repeat(64) },
      { stableIdentifier: 'removed', contentDigest: 'c'.repeat(64) },
    ];
    const next = [
      { stableIdentifier: 'same', contentDigest: 'a'.repeat(64) },
      { stableIdentifier: 'changed', contentDigest: 'd'.repeat(64) },
      { stableIdentifier: 'added', contentDigest: 'e'.repeat(64) },
    ];

    const delta = calculatePackageDelta(previous, next);
    expect(delta.map((item) => [item.stableIdentifier, item.kind])).toEqual([
      ['added', 'ADDED'],
      ['changed', 'CHANGED'],
      ['removed', 'REMOVED'],
      ['same', 'UNCHANGED'],
    ]);
    expect(recommendReviewFromDelta(delta)).toBe('FULL_REVIEW');
    expect(recommendReviewFromDelta(calculatePackageDelta(previous, previous))).toBe('NO_REVIEW');
  });

  it('does not present expired or future decisions as current assurance', () => {
    const now = new Date('2026-09-01T12:00:00.000Z');
    expect(isDecisionCurrent({ decision: 'ACCEPTED', issuedAt: '2026-08-01T00:00:00.000Z', validUntil: '2026-10-01T00:00:00.000Z', now })).toBe(true);
    expect(isDecisionCurrent({ decision: 'ACCEPTED', issuedAt: '2026-08-01T00:00:00.000Z', validUntil: '2026-09-01T11:59:59.000Z', now })).toBe(false);
    expect(isDecisionCurrent({ decision: 'ACCEPTED', issuedAt: '2026-09-02T00:00:00.000Z', validUntil: null, now })).toBe(false);
  });

  it('locks browser mutation authority behind matter-scoped RLS', () => {
    expect(migration).toContain('create or replace function app_private.can_access_legal_review');
    expect(migration).toContain('app_private.is_org_member(lr.organization_id)');
    expect(migration).toContain('app_private.is_current_counsel_profile(cp.id)');
    expect(migration).toContain('lag.active = true');
    expect(migration).toContain('lag.revoked_at is null');
    expect(migration).toContain('alter table public.%I force row level security');
    expect(migration).toContain('revoke insert, update, delete on table public.legal_review_requests from authenticated');
    expect(migration).toContain('authenticated legal assurance mutation policy unexpectedly exists');
  });

  it('makes packages and issued decisions immutable at the database boundary', () => {
    expect(migration).toContain('finalized legal review packages are immutable');
    expect(migration).toContain('finalized or missing legal review package cannot be mutated');
    expect(migration).toContain('issued legal review decisions are immutable; create a superseding decision');
    expect(migration).toContain('package_manifest_digest text not null');
    expect(migration).toContain("product_release_sha ~ '^[a-f0-9]{40}$'");
    expect(migration).toContain("content_digest ~ '^[a-f0-9]{64}$'");
    expect(migration).toContain("decision_digest ~ '^[a-f0-9]{64}$'");
  });

  it('keeps the state mutation RPC backend-only and package/decision-gated', () => {
    expect(migration).toContain('create or replace function public.transition_legal_review_atomic');
    expect(migration).toContain('for update;');
    expect(migration).toContain("return query select 'state_changed'");
    expect(migration).toContain("return query select 'invalid_transition'");
    expect(migration).toContain("return query select 'package_required'");
    expect(migration).toContain("return query select 'decision_required'");
    expect(migration).toContain('revoke all on function public.transition_legal_review_atomic(uuid,timestamptz,text) from public, anon, authenticated;');
    expect(migration).toContain('grant execute on function public.transition_legal_review_atomic(uuid,timestamptz,text) to service_role;');
  });
});
