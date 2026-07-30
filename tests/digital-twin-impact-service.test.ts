import { describe, expect, it, vi } from 'vitest';

import {
  executePersistedDigitalTwinImpact,
  type DigitalTwinImpactRepository,
} from '@/server/ai-governance/digital-twin-impact-service';

const now = new Date('2026-07-30T16:00:00.000Z');

function repository(): DigitalTwinImpactRepository {
  const persistedKeys = new Map<string, string>();

  return {
    loadOperationInput: vi.fn(async ({ organizationId, regulatoryImpactId }) => ({
      entities: [
        {
          id: 'vendor-1',
          organization_id: organizationId,
          entity_type: 'vendor' as const,
          name: 'Provider',
          lifecycle_status: 'approved',
        },
      ],
      links: [],
      evidence: [],
      entityControls: [],
      regulatoryImpact: {
        id: regulatoryImpactId,
        organization_id: organizationId,
        binding_status: 'binding' as const,
        effective_at: '2026-08-01T00:00:00.000Z',
        source_verified_at: '2026-07-30T15:00:00.000Z',
        affected_entity_ids: ['vendor-1'],
        affected_control_ids: [],
        owner_user_id: 'owner-1',
        due_at: '2026-08-05T00:00:00.000Z',
      },
    })),
    persistTasksAtomically: vi.fn(async ({ tasks }) =>
      tasks.map((task) => {
        const existing = persistedKeys.get(task.idempotencyKey);
        const id = existing ?? `task-${persistedKeys.size + 1}`;
        persistedKeys.set(task.idempotencyKey, id);
        return { ...task, id, created: !existing };
      }),
    ),
    appendAuditEvent: vi.fn(async () => undefined),
  };
}

describe('executePersistedDigitalTwinImpact', () => {
  it('loads server-scoped data, persists deterministic tasks and audits the decision', async () => {
    const repo = repository();

    const first = await executePersistedDigitalTwinImpact({
      actor: {
        userId: 'user-1',
        organizationId: 'org-1',
        role: 'compliance_manager',
      },
      regulatoryImpactId: 'impact-1',
      repository: repo,
      now,
    });

    const second = await executePersistedDigitalTwinImpact({
      actor: {
        userId: 'user-1',
        organizationId: 'org-1',
        role: 'compliance_manager',
      },
      regulatoryImpactId: 'impact-1',
      repository: repo,
      now,
    });

    expect(first.affectedNodeIds).toEqual(['vendor-1']);
    expect(first.tasks[0]).toMatchObject({ created: true, entityId: 'vendor-1' });
    expect(first.tasks[0].idempotencyKey).toMatch(/^[a-f0-9]{64}$/);
    expect(second.tasks[0]).toMatchObject({
      created: false,
      id: first.tasks[0].id,
      idempotencyKey: first.tasks[0].idempotencyKey,
    });
    expect(repo.loadOperationInput).toHaveBeenCalledWith({
      organizationId: 'org-1',
      regulatoryImpactId: 'impact-1',
    });
    expect(repo.appendAuditEvent).toHaveBeenCalledTimes(2);
  });

  it('rejects roles without governance write permission before repository access', async () => {
    const repo = repository();

    await expect(
      executePersistedDigitalTwinImpact({
        actor: { userId: 'user-2', organizationId: 'org-1', role: 'viewer' },
        regulatoryImpactId: 'impact-1',
        repository: repo,
        now,
      }),
    ).rejects.toThrow('digital_twin_impact_write_forbidden');

    expect(repo.loadOperationInput).not.toHaveBeenCalled();
  });

  it('fails closed when the repository returns another regulatory impact', async () => {
    const repo = repository();
    vi.mocked(repo.loadOperationInput).mockImplementationOnce(async ({ organizationId }) => ({
      entities: [],
      links: [],
      evidence: [],
      entityControls: [],
      regulatoryImpact: {
        id: 'impact-foreign',
        organization_id: organizationId,
        binding_status: 'binding',
        effective_at: null,
        source_verified_at: now.toISOString(),
        affected_entity_ids: [],
        affected_control_ids: [],
        owner_user_id: null,
        due_at: null,
      },
    }));

    await expect(
      executePersistedDigitalTwinImpact({
        actor: { userId: 'user-1', organizationId: 'org-1', role: 'owner' },
        regulatoryImpactId: 'impact-1',
        repository: repo,
        now,
      }),
    ).rejects.toThrow('regulatory_impact_repository_mismatch');

    expect(repo.persistTasksAtomically).not.toHaveBeenCalled();
    expect(repo.appendAuditEvent).not.toHaveBeenCalled();
  });
});
