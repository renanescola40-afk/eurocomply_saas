import { describe, expect, it } from 'vitest';

import { evaluateDigitalTwinRegulatoryImpact } from '@/server/ai-governance/digital-twin-impact-engine';

const digest = `sha256:${'a'.repeat(64)}`;
const now = new Date('2026-07-30T12:00:00.000Z');

const acceptedEvidence = {
  environment: 'production' as const,
  evidenceClass: 'provider' as const,
  integrityDigest: digest,
  sourceReference: 'runtime://deployment/sha',
  collectedAt: new Date('2026-07-29T12:00:00.000Z'),
  validFrom: new Date('2026-07-29T12:00:00.000Z'),
  validUntil: new Date('2026-08-29T12:00:00.000Z'),
  limitations: 'Production proof is scoped to the referenced deployment.',
  reviewStatus: 'accepted' as const,
};

describe('evaluateDigitalTwinRegulatoryImpact', () => {
  it('propagates impact through reverse dependencies and reports evidence health', () => {
    const result = evaluateDigitalTwinRegulatoryImpact({
      organizationId: 'org-1',
      now,
      regulatoryChange: {
        bindingStatus: 'binding',
        effectiveAt: new Date('2026-08-01T00:00:00.000Z'),
        sourceVerifiedAt: new Date('2026-07-30T10:00:00.000Z'),
        affectedEntityIds: ['vendor-1'],
        affectedControlIds: ['CTRL-10'],
      },
      nodes: [
        {
          id: 'vendor-1',
          organizationId: 'org-1',
          type: 'vendor',
          name: 'Model Provider',
          lifecycleState: 'active',
          controlIds: ['CTRL-10'],
          evidence: [acceptedEvidence],
        },
        {
          id: 'model-1',
          organizationId: 'org-1',
          type: 'model',
          name: 'Production Model',
          lifecycleState: 'active',
          controlIds: [],
          evidence: [],
        },
        {
          id: 'system-1',
          organizationId: 'org-1',
          type: 'system',
          name: 'Decision System',
          lifecycleState: 'active',
          controlIds: [],
          evidence: [acceptedEvidence],
        },
      ],
      edges: [
        {
          id: 'edge-1',
          organizationId: 'org-1',
          sourceNodeId: 'model-1',
          targetNodeId: 'vendor-1',
          relation: 'provided_by',
        },
        {
          id: 'edge-2',
          organizationId: 'org-1',
          sourceNodeId: 'system-1',
          targetNodeId: 'model-1',
          relation: 'uses',
        },
      ],
    });

    expect(result.decision.status).toBe('action_required');
    expect(result.affectedNodeIds).toEqual(['vendor-1', 'model-1', 'system-1']);
    expect(result.impactedNodes[0]).toMatchObject({
      nodeId: 'vendor-1',
      direct: true,
      depth: 0,
      evidenceHealth: 'healthy',
    });
    expect(result.impactedNodes[1]).toMatchObject({
      nodeId: 'model-1',
      inherited: true,
      depth: 1,
      evidenceHealth: 'missing',
    });
    expect(result.requiresAction).toBe(true);
  });

  it('fails closed when a node or edge crosses the organization boundary', () => {
    expect(() =>
      evaluateDigitalTwinRegulatoryImpact({
        organizationId: 'org-1',
        now,
        regulatoryChange: {
          bindingStatus: 'binding',
          sourceVerifiedAt: now,
          affectedEntityIds: [],
          affectedControlIds: [],
        },
        nodes: [
          {
            id: 'foreign-node',
            organizationId: 'org-2',
            type: 'system',
            name: 'Foreign system',
            lifecycleState: 'active',
            controlIds: [],
            evidence: [],
          },
        ],
        edges: [],
      }),
    ).toThrow('digital_twin_tenant_boundary_violation');
  });
});
