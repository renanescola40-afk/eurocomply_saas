import { describe, expect, it } from 'vitest';

import { executeDigitalTwinImpactOperation } from '@/server/ai-governance/digital-twin-impact-operations';

const now = new Date('2026-07-30T12:00:00.000Z');
const digest = `sha256:${'b'.repeat(64)}`;

function baseInput() {
  return {
    organizationId: 'org-1',
    now,
    entities: [
      {
        id: 'vendor-1',
        organization_id: 'org-1',
        entity_type: 'vendor' as const,
        name: 'Provider',
        lifecycle_status: 'approved',
      },
      {
        id: 'system-1',
        organization_id: 'org-1',
        entity_type: 'system' as const,
        name: 'Decision System',
        lifecycle_status: 'restricted',
      },
    ],
    links: [
      {
        id: 'link-1',
        organization_id: 'org-1',
        source_entity_id: 'system-1',
        target_entity_id: 'vendor-1',
        relation_type: 'provided_by',
      },
    ],
    evidence: [
      {
        organization_id: 'org-1',
        entity_id: 'vendor-1',
        environment: 'production' as const,
        evidence_class: 'provider' as const,
        integrity_digest: digest,
        source_reference: 'runtime://provider/version',
        collected_at: '2026-07-29T12:00:00.000Z',
        valid_from: '2026-07-29T12:00:00.000Z',
        valid_until: '2026-08-29T12:00:00.000Z',
        limitations: 'Scoped to the referenced provider version.',
        review_status: 'accepted' as const,
      },
    ],
    entityControls: [
      {
        organization_id: 'org-1',
        entity_id: 'vendor-1',
        control_id: 'control-1',
      },
    ],
    regulatoryImpact: {
      id: 'impact-1',
      organization_id: 'org-1',
      binding_status: 'binding' as const,
      effective_at: '2026-08-01T00:00:00.000Z',
      source_verified_at: '2026-07-30T10:00:00.000Z',
      affected_entity_ids: ['vendor-1'],
      affected_control_ids: ['control-1'],
      owner_user_id: 'user-1',
      due_at: '2026-08-05T00:00:00.000Z',
    },
  };
}

describe('executeDigitalTwinImpactOperation', () => {
  it('projects persisted rows into the canonical engine and creates action drafts', () => {
    const operation = executeDigitalTwinImpactOperation(baseInput());

    expect(operation.result.affectedNodeIds).toEqual(['vendor-1', 'system-1']);
    expect(operation.taskDrafts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityId: 'vendor-1',
          priority: 'medium',
          ownerUserId: 'user-1',
        }),
        expect.objectContaining({
          entityId: 'system-1',
          priority: 'critical',
          blockingReasons: expect.arrayContaining(['node_blocked', 'missing_evidence']),
        }),
      ]),
    );
  });

  it('fails closed when persisted rows cross the tenant boundary', () => {
    const input = baseInput();
    input.links[0].organization_id = 'org-2';

    expect(() => executeDigitalTwinImpactOperation(input)).toThrow(
      'links_tenant_boundary_violation',
    );
  });
});
