import { describe, expect, it } from 'vitest';

import { AI_ACT_LEGAL_RULES_VERSION } from '@/server/ai-governance/legal-rules';
import {
  buildRegulatoryControlTower,
  REGULATORY_CONTROL_TOWER_WORKSTREAMS,
  type RegulatoryControlTowerInput,
} from './regulatory-control-tower';

const record = (id: string, lifecycleState: string) => ({
  id,
  lifecycleState,
  updatedAt: '2026-08-12T19:00:00.000Z',
});

const readyPersisted: RegulatoryControlTowerInput = {
  ai_literacy: record('literacy', 'active'),
  fria: record('fria', 'approved'),
  prohibited_practices: record('prohibited', 'approved'),
  high_risk_provider_data: record('provider-data', 'approved'),
  annex_iv: record('annex', 'approved'),
  qms: record('qms', 'approved'),
  article_50_transparency: record('article-50', 'READY'),
  conformity: record('conformity', 'approved'),
};

describe('buildRegulatoryControlTower', () => {
  it('reports zero activation without organization-specific workflow evidence', () => {
    const result = buildRegulatoryControlTower({});

    expect(result.overallStatus).toBe('not_started');
    expect(result.activationPercent).toBe(0);
    expect(result.readyPercent).toBe(0);
    expect(result.notStartedCount).toBe(REGULATORY_CONTROL_TOWER_WORKSTREAMS.length);
    expect(result.repositoryControlWorkstreamIds).toEqual(['deployer_obligations', 'post_market_monitoring']);
    expect(result.requiredActions).toHaveLength(REGULATORY_CONTROL_TOWER_WORKSTREAMS.length);
  });

  it('keeps repository implementation coverage separate from tenant runtime readiness', () => {
    const result = buildRegulatoryControlTower(readyPersisted);

    expect(result.overallStatus).toBe('in_progress');
    expect(result.activationPercent).toBe(80);
    expect(result.readyPercent).toBe(80);
    expect(result.readyCount).toBe(8);
    expect(result.repositoryControlCount).toBe(2);
    expect(result.blockingWorkstreamIds).toEqual([]);
    expect(result.requiredActions.join(' ')).toContain('repository implementation and CI coverage alone are not a tenant readiness pass');
  });

  it('surfaces Article 50 as a persisted, human-reviewed workstream', () => {
    const result = buildRegulatoryControlTower(readyPersisted);

    expect(result.workstreams.find((item) => item.id === 'article_50_transparency')).toMatchObject({
      articleReference: 'Article 50',
      status: 'ready',
      stateSource: 'persisted_tenant_state',
      humanReviewRequired: true,
      route: '/dashboard/transparencia',
    });
  });

  it('maps Article 50 NEEDS_REVIEW to in-progress rather than treating it as a legal pass', () => {
    const result = buildRegulatoryControlTower({
      ...readyPersisted,
      article_50_transparency: record('article-50', 'NEEDS_REVIEW'),
    });

    expect(result.workstreams.find((item) => item.id === 'article_50_transparency')?.status).toBe('in_progress');
    expect(result.inProgressCount).toBe(1);
  });

  it('fails closed when any persisted workflow is blocked', () => {
    const result = buildRegulatoryControlTower({
      ...readyPersisted,
      prohibited_practices: record('prohibited', 'blocked'),
    });

    expect(result.overallStatus).toBe('blocked');
    expect(result.blockedCount).toBe(1);
    expect(result.blockingWorkstreamIds).toEqual(['prohibited_practices']);
    expect(result.readyPercent).toBeLessThan(80);
    expect(result.requiredActions.join(' ')).toContain('Resolve the blocking findings');
  });

  it('separates activation from readiness for draft and review states', () => {
    const result = buildRegulatoryControlTower({
      ai_literacy: record('literacy', 'draft'),
      fria: record('fria', 'assessment'),
      annex_iv: record('annex', 'review'),
    });

    expect(result.overallStatus).toBe('in_progress');
    expect(result.activationPercent).toBeGreaterThan(0);
    expect(result.readyPercent).toBe(0);
    expect(result.inProgressCount).toBe(3);
  });

  it('counts reviewed non-applicability as ready-weight without claiming an approved workflow', () => {
    const result = buildRegulatoryControlTower({
      ...readyPersisted,
      conformity: record('conformity', 'not_applicable'),
    });

    expect(result.overallStatus).toBe('in_progress');
    expect(result.readyPercent).toBe(80);
    expect(result.readyCount).toBe(7);
    expect(result.notApplicableCount).toBe(1);
  });

  it('treats archived and retired workflows as inactive', () => {
    const result = buildRegulatoryControlTower({
      ai_literacy: record('literacy', 'archived'),
      qms: record('qms', 'retired'),
    });

    expect(result.activationPercent).toBe(0);
    expect(result.notStartedCount).toBe(REGULATORY_CONTROL_TOWER_WORKSTREAMS.length);
  });

  it('anchors every workstream to the versioned legal rules and explicit human-review boundary', () => {
    const result = buildRegulatoryControlTower(readyPersisted);

    expect(result.legalRulesVersion).toBe(AI_ACT_LEGAL_RULES_VERSION);
    expect(result.workstreams.every((item) => item.legalRulesVersion === AI_ACT_LEGAL_RULES_VERSION)).toBe(true);
    expect(result.workstreams.every((item) => item.humanReviewRequired)).toBe(true);
    expect(result.humanReviewBoundary).toContain('HUMAN_REVIEW_REQUIRED');
    expect(result.evidenceBoundary).toContain('does not validate underlying evidence');
  });
});
