import type { EvidenceCandidate, RegulatoryChange } from '@/lib/ai-governance/market-leadership-foundations';
import {
  evaluateDigitalTwinRegulatoryImpact,
  type DigitalTwinEdge,
  type DigitalTwinNode,
} from '@/server/ai-governance/digital-twin-impact-engine';

export type GovernanceEntityRow = {
  id: string;
  organization_id: string;
  entity_type: DigitalTwinNode['type'];
  name: string;
  lifecycle_status: string;
};

export type GovernanceEntityLinkRow = {
  id: string;
  organization_id: string;
  source_entity_id: string;
  target_entity_id: string;
  relation_type: string;
};

export type GovernanceEvidenceRow = {
  organization_id: string;
  entity_id: string | null;
  environment: EvidenceCandidate['environment'];
  evidence_class: EvidenceCandidate['evidenceClass'];
  integrity_digest: string;
  source_reference: string;
  collected_at: string;
  valid_from: string;
  valid_until: string | null;
  limitations: string;
  review_status: EvidenceCandidate['reviewStatus'];
};

export type EntityControlRow = {
  organization_id: string;
  entity_id: string;
  control_id: string;
};

export type RegulatoryImpactRow = {
  id: string;
  organization_id: string;
  binding_status: RegulatoryChange['bindingStatus'];
  effective_at: string | null;
  source_verified_at: string | null;
  affected_entity_ids: string[];
  affected_control_ids: string[];
  owner_user_id: string | null;
  due_at: string | null;
};

export type ImpactTaskDraft = {
  organizationId: string;
  regulatoryImpactId: string;
  entityId: string;
  ownerUserId: string | null;
  dueAt: string | null;
  priority: 'medium' | 'high' | 'critical';
  title: string;
  blockingReasons: string[];
};

export type DigitalTwinImpactOperationInput = {
  organizationId: string;
  entities: GovernanceEntityRow[];
  links: GovernanceEntityLinkRow[];
  evidence: GovernanceEvidenceRow[];
  entityControls: EntityControlRow[];
  regulatoryImpact: RegulatoryImpactRow;
  now?: Date;
};

function assertOrganization<T extends { organization_id: string }>(
  organizationId: string,
  rows: T[],
  label: string,
): void {
  if (rows.some((row) => row.organization_id !== organizationId)) {
    throw new Error(`${label}_tenant_boundary_violation`);
  }
}

function lifecycleState(value: string): DigitalTwinNode['lifecycleState'] {
  if (value === 'retired') return 'retired';
  if (value === 'restricted' || value === 'suspended') return 'blocked';
  if (value === 'approved') return 'active';
  return 'draft';
}

function relation(value: string): DigitalTwinEdge['relation'] {
  if (['depends_on', 'provided_by', 'uses', 'trained_on'].includes(value)) {
    return value as DigitalTwinEdge['relation'];
  }
  return 'controlled_by';
}

export function executeDigitalTwinImpactOperation(
  input: DigitalTwinImpactOperationInput,
): {
  result: ReturnType<typeof evaluateDigitalTwinRegulatoryImpact>;
  taskDrafts: ImpactTaskDraft[];
} {
  assertOrganization(input.organizationId, input.entities, 'entities');
  assertOrganization(input.organizationId, input.links, 'links');
  assertOrganization(input.organizationId, input.evidence, 'evidence');
  assertOrganization(input.organizationId, input.entityControls, 'entity_controls');

  if (input.regulatoryImpact.organization_id !== input.organizationId) {
    throw new Error('regulatory_impact_tenant_boundary_violation');
  }

  const evidenceByEntity = new Map<string, EvidenceCandidate[]>();
  for (const row of input.evidence) {
    if (!row.entity_id) continue;
    const candidate: EvidenceCandidate = {
      environment: row.environment,
      evidenceClass: row.evidence_class,
      integrityDigest: row.integrity_digest,
      sourceReference: row.source_reference,
      collectedAt: new Date(row.collected_at),
      validFrom: new Date(row.valid_from),
      validUntil: row.valid_until ? new Date(row.valid_until) : null,
      limitations: row.limitations,
      reviewStatus: row.review_status,
    };
    evidenceByEntity.set(row.entity_id, [...(evidenceByEntity.get(row.entity_id) ?? []), candidate]);
  }

  const controlsByEntity = new Map<string, string[]>();
  for (const row of input.entityControls) {
    controlsByEntity.set(row.entity_id, [...(controlsByEntity.get(row.entity_id) ?? []), row.control_id]);
  }

  const nodes: DigitalTwinNode[] = input.entities.map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    type: row.entity_type,
    name: row.name,
    lifecycleState: lifecycleState(row.lifecycle_status),
    controlIds: controlsByEntity.get(row.id) ?? [],
    evidence: evidenceByEntity.get(row.id) ?? [],
  }));

  const edges: DigitalTwinEdge[] = input.links.map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    sourceNodeId: row.source_entity_id,
    targetNodeId: row.target_entity_id,
    relation: relation(row.relation_type),
  }));

  const regulatoryChange: RegulatoryChange = {
    bindingStatus: input.regulatoryImpact.binding_status,
    effectiveAt: input.regulatoryImpact.effective_at
      ? new Date(input.regulatoryImpact.effective_at)
      : null,
    sourceVerifiedAt: input.regulatoryImpact.source_verified_at
      ? new Date(input.regulatoryImpact.source_verified_at)
      : null,
    affectedEntityIds: input.regulatoryImpact.affected_entity_ids,
    affectedControlIds: input.regulatoryImpact.affected_control_ids,
  };

  const result = evaluateDigitalTwinRegulatoryImpact({
    organizationId: input.organizationId,
    nodes,
    edges,
    regulatoryChange,
    now: input.now,
  });

  const taskDrafts = result.impactedNodes
    .filter((node) => node.direct || node.blockingReasons.length > 0)
    .map((node): ImpactTaskDraft => ({
      organizationId: input.organizationId,
      regulatoryImpactId: input.regulatoryImpact.id,
      entityId: node.nodeId,
      ownerUserId: input.regulatoryImpact.owner_user_id,
      dueAt: input.regulatoryImpact.due_at,
      priority:
        node.blockingReasons.includes('node_blocked')
          ? 'critical'
          : node.evidenceHealth === 'missing'
            ? 'high'
            : 'medium',
      title: `Review regulatory impact for ${node.name}`,
      blockingReasons: node.blockingReasons,
    }));

  return { result, taskDrafts };
}
