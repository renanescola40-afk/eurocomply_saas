import { createHash } from 'node:crypto';

import {
  executeDigitalTwinImpactOperation,
  type DigitalTwinImpactOperationInput,
  type ImpactTaskDraft,
} from '@/server/ai-governance/digital-twin-impact-operations';

export type DigitalTwinImpactActor = {
  userId: string;
  organizationId: string;
  role: 'owner' | 'admin' | 'compliance_manager' | 'member' | 'viewer';
};

export type PersistedImpactTask = ImpactTaskDraft & {
  id: string;
  idempotencyKey: string;
  created: boolean;
};

export type DigitalTwinImpactRepository = {
  loadOperationInput(args: {
    organizationId: string;
    regulatoryImpactId: string;
  }): Promise<Omit<DigitalTwinImpactOperationInput, 'organizationId' | 'now'>>;
  persistTasksAtomically(args: {
    organizationId: string;
    regulatoryImpactId: string;
    actorUserId: string;
    tasks: Array<ImpactTaskDraft & { idempotencyKey: string }>;
  }): Promise<PersistedImpactTask[]>;
  appendAuditEvent(args: {
    organizationId: string;
    actorUserId: string;
    eventType: 'digital_twin_impact_evaluated';
    targetId: string;
    metadata: Record<string, unknown>;
  }): Promise<void>;
};

export type ExecutePersistedImpactArgs = {
  actor: DigitalTwinImpactActor;
  regulatoryImpactId: string;
  repository: DigitalTwinImpactRepository;
  now?: Date;
};

export type ExecutePersistedImpactResult = {
  affectedNodeIds: string[];
  requiresAction: boolean;
  decisionStatus: string;
  tasks: PersistedImpactTask[];
};

const WRITE_ROLES = new Set<DigitalTwinImpactActor['role']>([
  'owner',
  'admin',
  'compliance_manager',
]);

function assertAuthorized(actor: DigitalTwinImpactActor): void {
  if (!actor.userId.trim() || !actor.organizationId.trim()) {
    throw new Error('digital_twin_actor_context_missing');
  }

  if (!WRITE_ROLES.has(actor.role)) {
    throw new Error('digital_twin_impact_write_forbidden');
  }
}

function taskIdempotencyKey(task: ImpactTaskDraft): string {
  return createHash('sha256')
    .update([
      task.organizationId,
      task.regulatoryImpactId,
      task.entityId,
      task.title.trim().toLowerCase(),
    ].join(':'))
    .digest('hex');
}

export async function executePersistedDigitalTwinImpact(
  args: ExecutePersistedImpactArgs,
): Promise<ExecutePersistedImpactResult> {
  assertAuthorized(args.actor);

  if (!args.regulatoryImpactId.trim()) {
    throw new Error('regulatory_impact_id_required');
  }

  const persisted = await args.repository.loadOperationInput({
    organizationId: args.actor.organizationId,
    regulatoryImpactId: args.regulatoryImpactId,
  });

  if (persisted.regulatoryImpact.id !== args.regulatoryImpactId) {
    throw new Error('regulatory_impact_repository_mismatch');
  }

  const operation = executeDigitalTwinImpactOperation({
    ...persisted,
    organizationId: args.actor.organizationId,
    now: args.now,
  });

  const tasks = operation.taskDrafts.map((task) => ({
    ...task,
    idempotencyKey: taskIdempotencyKey(task),
  }));

  const persistedTasks = tasks.length > 0
    ? await args.repository.persistTasksAtomically({
        organizationId: args.actor.organizationId,
        regulatoryImpactId: args.regulatoryImpactId,
        actorUserId: args.actor.userId,
        tasks,
      })
    : [];

  await args.repository.appendAuditEvent({
    organizationId: args.actor.organizationId,
    actorUserId: args.actor.userId,
    eventType: 'digital_twin_impact_evaluated',
    targetId: args.regulatoryImpactId,
    metadata: {
      affectedNodeCount: operation.result.affectedNodeIds.length,
      requiresAction: operation.result.requiresAction,
      decisionStatus: operation.result.decision.status,
      taskCount: persistedTasks.length,
      createdTaskCount: persistedTasks.filter((task) => task.created).length,
    },
  });

  return {
    affectedNodeIds: operation.result.affectedNodeIds,
    requiresAction: operation.result.requiresAction,
    decisionStatus: operation.result.decision.status,
    tasks: persistedTasks,
  };
}
