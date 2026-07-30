import {
  classifyRegulatoryImpact,
  evaluateEvidence,
  type EvidenceCandidate,
  type GovernanceEntityType,
  type RegulatoryChange,
} from '@/lib/ai-governance/market-leadership-foundations';

export type DigitalTwinNode = {
  id: string;
  organizationId: string;
  type: GovernanceEntityType;
  name: string;
  lifecycleState: 'draft' | 'active' | 'blocked' | 'retired';
  controlIds: string[];
  evidence: EvidenceCandidate[];
};

export type DigitalTwinEdge = {
  id: string;
  organizationId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relation: 'depends_on' | 'provided_by' | 'uses' | 'trained_on' | 'controlled_by';
};

export type DigitalTwinImpactInput = {
  organizationId: string;
  nodes: DigitalTwinNode[];
  edges: DigitalTwinEdge[];
  regulatoryChange: RegulatoryChange;
  now?: Date;
};

export type DigitalTwinImpactNode = {
  nodeId: string;
  name: string;
  type: GovernanceEntityType;
  direct: boolean;
  inherited: boolean;
  depth: number;
  matchedControlIds: string[];
  evidenceHealth: 'healthy' | 'degraded' | 'missing';
  blockingReasons: string[];
};

export type DigitalTwinImpactResult = {
  decision: ReturnType<typeof classifyRegulatoryImpact>;
  impactedNodes: DigitalTwinImpactNode[];
  affectedNodeIds: string[];
  requiresAction: boolean;
  tenantBoundaryValid: boolean;
};

function assertTenantBoundary(input: DigitalTwinImpactInput): void {
  const foreignNode = input.nodes.find((node) => node.organizationId !== input.organizationId);
  const foreignEdge = input.edges.find((edge) => edge.organizationId !== input.organizationId);

  if (foreignNode || foreignEdge) {
    throw new Error('digital_twin_tenant_boundary_violation');
  }
}

function evidenceHealth(node: DigitalTwinNode, now: Date) {
  if (node.evidence.length === 0) {
    return { status: 'missing' as const, reasons: ['missing_evidence'] };
  }

  const decisions = node.evidence.map((candidate) => evaluateEvidence(candidate, now));
  const acceptedCurrent = decisions.some((decision) => decision.accepted && decision.current);

  if (acceptedCurrent) {
    return { status: 'healthy' as const, reasons: [] };
  }

  return {
    status: 'degraded' as const,
    reasons: [...new Set(decisions.flatMap((decision) => decision.reasons))],
  };
}

export function evaluateDigitalTwinRegulatoryImpact(
  input: DigitalTwinImpactInput,
): DigitalTwinImpactResult {
  assertTenantBoundary(input);

  const now = input.now ?? new Date();
  const decision = classifyRegulatoryImpact(input.regulatoryChange, now);
  const nodesById = new Map(input.nodes.map((node) => [node.id, node]));
  const impacted = new Map<string, { direct: boolean; depth: number }>();
  const queue: Array<{ nodeId: string; depth: number }> = [];

  for (const node of input.nodes) {
    const directEntityMatch = input.regulatoryChange.affectedEntityIds.includes(node.id);
    const directControlMatch = node.controlIds.some((controlId) =>
      input.regulatoryChange.affectedControlIds.includes(controlId),
    );

    if (directEntityMatch || directControlMatch) {
      impacted.set(node.id, { direct: true, depth: 0 });
      queue.push({ nodeId: node.id, depth: 0 });
    }
  }

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;

    for (const edge of input.edges) {
      if (edge.targetNodeId !== current.nodeId) continue;
      if (!nodesById.has(edge.sourceNodeId)) continue;

      const nextDepth = current.depth + 1;
      const existing = impacted.get(edge.sourceNodeId);
      if (existing && existing.depth <= nextDepth) continue;

      impacted.set(edge.sourceNodeId, { direct: false, depth: nextDepth });
      queue.push({ nodeId: edge.sourceNodeId, depth: nextDepth });
    }
  }

  const impactedNodes = [...impacted.entries()]
    .map(([nodeId, impact]): DigitalTwinImpactNode => {
      const node = nodesById.get(nodeId);
      if (!node) throw new Error('digital_twin_node_not_found');

      const health = evidenceHealth(node, now);
      return {
        nodeId,
        name: node.name,
        type: node.type,
        direct: impact.direct,
        inherited: !impact.direct,
        depth: impact.depth,
        matchedControlIds: node.controlIds.filter((controlId) =>
          input.regulatoryChange.affectedControlIds.includes(controlId),
        ),
        evidenceHealth: health.status,
        blockingReasons: [
          ...(node.lifecycleState === 'blocked' ? ['node_blocked'] : []),
          ...health.reasons,
        ],
      };
    })
    .sort((left, right) => left.depth - right.depth || left.name.localeCompare(right.name));

  return {
    decision,
    impactedNodes,
    affectedNodeIds: impactedNodes.map((node) => node.nodeId),
    requiresAction:
      decision.status === 'action_required' ||
      impactedNodes.some((node) => node.blockingReasons.length > 0),
    tenantBoundaryValid: true,
  };
}
