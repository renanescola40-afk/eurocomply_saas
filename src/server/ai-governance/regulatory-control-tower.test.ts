import { describe, expect, it } from 'vitest';

import {
  buildRegulatoryControlTower,
  REGULATORY_CONTROL_TOWER_WORKSTREAMS,
  type RegulatoryControlTowerInput,
} from './regulatory-control-tower';

const record = (id: string, lifecycleState: string) => ({
  id,
  lifecycleState,
  updatedAt: '2026-07-21T19:00:00.000Z',
});

const ready: RegulatoryControlTowerInput = {
  ai_literacy: record('literacy', 'active'),
  fria: record('fria', 'approved'),
  prohibited_practices: record('prohibited', 'approved'),
  high_risk_provider_data: record('provider-data', 'approved'),
  annex_iv: record('annex', 'approved'),
  qms: record('qms', 'approved'),
  conformity: record('conformity', 'approved'),
};

describe('buildRegulatoryControlTower', () => {
  it('reports zero activation without persisted workflows', () => {
    const result = buildRegulatoryControlTower({});

    expect(result.overallStatus).toBe('not_started');
    expect(result.activationPercent).toBe(0);
    expect(result.readyPercent).toBe(0);
    expect(result.notStartedCount).toBe(REGULATORY_CONTROL_TOWER_WORKSTREAMS.length);
    expect(result.requiredActions).toHaveLength(REGULATORY_CONTROL_TOWER_WORKSTREAMS.length);
  });

  it('reports full workflow readiness only when every weighted workflow is ready', () => {
    const result = buildRegulatoryControlTower(ready);

    expect(result.overallStatus).toBe('ready');
    expect(result.activationPercent).toBe(100);
    expect(result.readyPercent).toBe(100);
    expect(result.readyCount).toBe(REGULATORY_CONTROL_TOWER_WORKSTREAMS.length);
    expect(result.blockingWorkstreamIds).toEqual([]);
    expect(result.requiredActions).toEqual([]);
  });

  it('fails closed when any persisted workflow is blocked', () => {
    const result = buildRegulatoryControlTower({
      ...ready,
      prohibited_practices: record('prohibited', 'blocked'),
    });

    expect(result.overallStatus).toBe('blocked');
    expect(result.blockedCount).toBe(1);
    expect(result.blockingWorkstreamIds).toEqual(['prohibited_practices']);
    expect(result.readyPercent).toBeLessThan(100);
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

  it('counts reviewed non-applicability as ready without claiming an approved workflow', () => {
    const result = buildRegulatoryControlTower({
      ...ready,
      conformity: record('conformity', 'not_applicable'),
    });

    expect(result.overallStatus).toBe('ready');
    expect(result.readyPercent).toBe(100);
    expect(result.readyCount).toBe(6);
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
});
