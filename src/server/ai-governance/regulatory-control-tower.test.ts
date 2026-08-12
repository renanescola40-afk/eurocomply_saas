import { describe, expect, it } from 'vitest';

import { AI_ACT_LEGAL_RULES_VERSION } from '@/server/ai-governance/legal-rules';
import {
  REGULATORY_CONTROL_TOWER_WORKSTREAMS,
  buildRegulatoryControlTower,
  type RegulatoryControlTowerInput,
} from './regulatory-control-tower';

const readyPersisted: RegulatoryControlTowerInput = {
  ai_literacy: { id: 'literacy', lifecycleState: 'active', updatedAt: '2026-08-12T10:00:00Z' },
  prohibited_practices: { id: 'prohibited', lifecycleState: 'approved', updatedAt: '2026-08-12T10:00:00Z' },
  high_risk_provider_data: { id: 'provider-data', lifecycleState: 'ready', updatedAt: '2026-08-12T10:00:00Z' },
  annex_iv: { id: 'annex-iv', lifecycleState: 'complete', updatedAt: '2026-08-12T10:00:00Z' },
  qms: { id: 'qms', lifecycleState: 'approved', updatedAt: '2026-08-12T10:00:00Z' },
  fria: { id: 'fria', lifecycleState: 'approved', updatedAt: '2026-08-12T10:00:00Z' },
  article_50_transparency: { id: 'article-50', lifecycleState: 'READY', updatedAt: '2026-08-12T10:00:00Z' },
  conformity: { id: 'conformity', lifecycleState: 'approved', updatedAt: '2026-08-12T10:00:00Z' },
};

describe('EU AI Act regulatory control tower', () => {
  it('surfaces Article 50 and never hides known product capability gaps', () => {
    const tower = buildRegulatoryControlTower(readyPersisted);

    expect(REGULATORY_CONTROL_TOWER_WORKSTREAMS).toContain('article_50_transparency');
    expect(REGULATORY_CONTROL_TOWER_WORKSTREAMS).toContain('deployer_obligations');
    expect(REGULATORY_CONTROL_TOWER_WORKSTREAMS).toContain('post_market_monitoring');
    expect(tower.workstreams.find((item) => item.id === 'article_50_transparency')).toMatchObject({
      articleReference: 'Article 50',
      status: 'ready',
      implementationState: 'persisted_workflow',
      humanReviewRequired: true,
    });
    expect(tower.capabilityGapWorkstreamIds).toEqual(['deployer_obligations', 'post_market_monitoring']);
    expect(tower.capabilityGapCount).toBe(2);
    expect(tower.overallStatus).toBe('blocked');
  });

  it('maps Article 50 NEEDS_REVIEW to in-progress rather than treating it as a legal pass', () => {
    const tower = buildRegulatoryControlTower({
      ...readyPersisted,
      article_50_transparency: {
        id: 'article-50',
        lifecycleState: 'NEEDS_REVIEW',
        updatedAt: '2026-08-12T10:00:00Z',
      },
    });

    expect(tower.workstreams.find((item) => item.id === 'article_50_transparency')?.status).toBe('in_progress');
  });

  it('anchors every workstream to the versioned legal rule set and explicit human-review boundary', () => {
    const tower = buildRegulatoryControlTower(readyPersisted);

    expect(tower.legalRulesVersion).toBe(AI_ACT_LEGAL_RULES_VERSION);
    expect(tower.workstreams.every((item) => item.legalRulesVersion === AI_ACT_LEGAL_RULES_VERSION)).toBe(true);
    expect(tower.workstreams.every((item) => item.humanReviewRequired)).toBe(true);
    expect(tower.humanReviewBoundary).toContain('HUMAN_REVIEW_REQUIRED');
    expect(tower.evidenceBoundary).toContain('does not validate underlying evidence');
  });
});
