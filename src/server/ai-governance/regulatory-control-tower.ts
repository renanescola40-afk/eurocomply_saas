export const REGULATORY_CONTROL_TOWER_WORKSTREAMS = [
  'ai_literacy',
  'fria',
  'prohibited_practices',
  'high_risk_provider_data',
  'annex_iv',
  'qms',
  'conformity',
] as const;

export type RegulatoryControlTowerWorkstreamId = (typeof REGULATORY_CONTROL_TOWER_WORKSTREAMS)[number];
export type RegulatoryControlTowerStatus = 'not_started' | 'in_progress' | 'ready' | 'blocked' | 'not_applicable';
export type RegulatoryControlTowerOverallStatus = 'not_started' | 'in_progress' | 'ready' | 'blocked';

export type RegulatoryWorkflowRecord = { id: string; lifecycleState: string; updatedAt: string | null };
export type RegulatoryControlTowerInput = Partial<Record<RegulatoryControlTowerWorkstreamId, RegulatoryWorkflowRecord | null>>;
export type RegulatoryControlTowerWorkstream = { id: RegulatoryControlTowerWorkstreamId; label: string; articleReference: string; weight: number; status: RegulatoryControlTowerStatus; lifecycleState: string | null; recordId: string | null; updatedAt: string | null; route: string | null; requiredAction: string | null };
export type RegulatoryControlTowerDecision = { version: string; overallStatus: RegulatoryControlTowerOverallStatus; activationPercent: number; readyPercent: number; activatedWeight: number; readyWeight: number; totalWeight: number; readyCount: number; blockedCount: number; inProgressCount: number; notStartedCount: number; notApplicableCount: number; workstreams: RegulatoryControlTowerWorkstream[]; blockingWorkstreamIds: RegulatoryControlTowerWorkstreamId[]; requiredActions: string[]; evidenceBoundary: string };

const VERSION = '2026-07-21.1';
const DEFINITIONS: Record<RegulatoryControlTowerWorkstreamId, { label: string; articleReference: string; weight: number; route: string | null }> = {
  ai_literacy: { label: 'AI Literacy', articleReference: 'Article 4', weight: 6, route: '/dashboard/ai-literacy' },
  fria: { label: 'Fundamental Rights Impact Assessment', articleReference: 'Article 27', weight: 6, route: '/dashboard/fria' },
  prohibited_practices: { label: 'Prohibited Practices', articleReference: 'Article 5', weight: 7, route: '/dashboard/prohibited-practices' },
  high_risk_provider_data: { label: 'High-Risk Provider Data Governance', articleReference: 'Article 10', weight: 9, route: '/dashboard/provider-data' },
  annex_iv: { label: 'Annex IV Technical Documentation', articleReference: 'Article 11 and Annex IV', weight: 6, route: null },
  qms: { label: 'Quality Management System', articleReference: 'Article 17', weight: 5, route: null },
  conformity: { label: 'Conformity, Declaration, CE and Registration', articleReference: 'Articles 43–49', weight: 5, route: null },
};
const READY_STATES = new Set(['active', 'approved', 'ready', 'complete', 'completed']);
const BLOCKED_STATES = new Set(['blocked', 'rejected', 'failed']);
const NOT_APPLICABLE_STATES = new Set(['not_applicable', 'not_required']);
const RETIRED_STATES = new Set(['retired', 'archived']);
function normaliseState(value: string | null | undefined) { return value?.trim().toLowerCase() ?? ''; }
function classify(record: RegulatoryWorkflowRecord | null | undefined): RegulatoryControlTowerStatus { if (!record) return 'not_started'; const state = normaliseState(record.lifecycleState); if (BLOCKED_STATES.has(state)) return 'blocked'; if (NOT_APPLICABLE_STATES.has(state)) return 'not_applicable'; if (READY_STATES.has(state)) return 'ready'; if (!state || RETIRED_STATES.has(state)) return 'not_started'; return 'in_progress'; }
function actionFor(status: RegulatoryControlTowerStatus, definition: (typeof DEFINITIONS)[RegulatoryControlTowerWorkstreamId]) { if (status === 'not_started') return `Create and scope the ${definition.label} workflow.`; if (status === 'blocked') return `Resolve the blocking findings in ${definition.label} before release readiness.`; if (status === 'in_progress') return `Complete evidence, review and approval for ${definition.label}.`; return null; }

export function buildRegulatoryControlTower(input: RegulatoryControlTowerInput): RegulatoryControlTowerDecision {
  const workstreams = REGULATORY_CONTROL_TOWER_WORKSTREAMS.map((id): RegulatoryControlTowerWorkstream => { const definition = DEFINITIONS[id]; const record = input[id] ?? null; const status = classify(record); return { id, label: definition.label, articleReference: definition.articleReference, weight: definition.weight, status, lifecycleState: record?.lifecycleState ?? null, recordId: record?.id ?? null, updatedAt: record?.updatedAt ?? null, route: definition.route, requiredAction: actionFor(status, definition) }; });
  const totalWeight = workstreams.reduce((total, item) => total + item.weight, 0);
  const activatedWeight = workstreams.filter((item) => item.status !== 'not_started').reduce((total, item) => total + item.weight, 0);
  const readyWeight = workstreams.filter((item) => item.status === 'ready' || item.status === 'not_applicable').reduce((total, item) => total + item.weight, 0);
  const blocked = workstreams.filter((item) => item.status === 'blocked'); const inProgress = workstreams.filter((item) => item.status === 'in_progress'); const notStarted = workstreams.filter((item) => item.status === 'not_started'); const ready = workstreams.filter((item) => item.status === 'ready'); const notApplicable = workstreams.filter((item) => item.status === 'not_applicable');
  let overallStatus: RegulatoryControlTowerOverallStatus = 'not_started'; if (blocked.length > 0) overallStatus = 'blocked'; else if (readyWeight === totalWeight) overallStatus = 'ready'; else if (activatedWeight > 0) overallStatus = 'in_progress';
  return { version: VERSION, overallStatus, activationPercent: Math.round((activatedWeight / totalWeight) * 100), readyPercent: Math.round((readyWeight / totalWeight) * 100), activatedWeight, readyWeight, totalWeight, readyCount: ready.length, blockedCount: blocked.length, inProgressCount: inProgress.length, notStartedCount: notStarted.length, notApplicableCount: notApplicable.length, workstreams, blockingWorkstreamIds: blocked.map((item) => item.id), requiredActions: workstreams.map((item) => item.requiredAction).filter((action): action is string => Boolean(action)), evidenceBoundary: 'This control tower aggregates persisted workflow lifecycle states for operational visibility. It does not validate underlying evidence, certify compliance, authorize market placement or replace legal, technical or conformity assessment review.' };
}