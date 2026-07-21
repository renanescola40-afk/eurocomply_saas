import { describe, expect, it } from 'vitest';

import { buildRegulatoryControlTower } from '../src/server/ai-governance/regulatory-control-tower';

describe('regulatory control tower readiness boundary', () => {
  it('does not treat an operating QMS as finally approved', () => {
    const result = buildRegulatoryControlTower({
      qms: {
        id: 'qms-operating',
        lifecycleState: 'operating',
        updatedAt: '2026-07-21T20:00:00.000Z',
      },
    });

    const qms = result.workstreams.find((workstream) => workstream.id === 'qms');
    expect(qms?.status).toBe('in_progress');
    expect(result.readyPercent).toBe(0);
  });
});
