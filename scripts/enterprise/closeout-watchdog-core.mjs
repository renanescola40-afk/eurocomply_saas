const SHA_PATTERN = /^[a-f0-9]{40}$/;
const TERMINAL_SUCCESS = 'success';
const ACTIVE_RUN_STATUSES = new Set(['queued', 'in_progress', 'pending', 'requested', 'waiting']);

export const LANE_EVENTS = Object.freeze(['push', 'workflow_dispatch']);
export const SAFE_ORCHESTRATOR_EVENTS = Object.freeze(['workflow_run', 'workflow_dispatch']);
export const FULL_ORCHESTRATOR_EVENTS = Object.freeze(['workflow_dispatch']);

export function assertReleaseSha(value) {
  const releaseSha = String(value || '').toLowerCase();
  if (!SHA_PATTERN.test(releaseSha)) {
    throw new Error('releaseSha must be a lowercase full 40-character Git SHA');
  }
  return releaseSha;
}

function validDate(value) {
  const timestamp = new Date(value || 0).getTime();
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : 0;
}

export function selectLatestExactShaRun(runs, {
  releaseSha,
  allowedEvents,
  headBranch = 'main',
} = {}) {
  const exactSha = assertReleaseSha(releaseSha);
  const eventSet = new Set(Array.isArray(allowedEvents) ? allowedEvents : []);
  if (eventSet.size === 0) throw new Error('allowedEvents must contain at least one event');
  if (headBranch !== 'main') throw new Error('closeout watchdog is restricted to main');

  return (Array.isArray(runs) ? runs : [])
    .filter((run) => Number.isSafeInteger(run?.id) && run.id > 0)
    .filter((run) => String(run?.head_sha || '').toLowerCase() === exactSha)
    .filter((run) => run?.head_branch === headBranch)
    .filter((run) => eventSet.has(run?.event))
    .sort((left, right) => validDate(right?.created_at) - validDate(left?.created_at))[0] ?? null;
}

function sanitizeArtifactNames(artifacts, artifactPrefix) {
  if (!artifactPrefix || typeof artifactPrefix !== 'string') return [];
  return (Array.isArray(artifacts) ? artifacts : [])
    .filter((artifact) => Number.isSafeInteger(artifact?.id) && artifact.id > 0)
    .filter((artifact) => artifact?.expired !== true)
    .filter((artifact) => Number.isSafeInteger(artifact?.size_in_bytes) && artifact.size_in_bytes > 0 && artifact.size_in_bytes <= 100 * 1024 * 1024)
    .map((artifact) => String(artifact?.name || ''))
    .filter((name) => name.startsWith(artifactPrefix))
    .filter((name) => /^[A-Za-z0-9_.-]{1,180}$/.test(name))
    .sort();
}

export function classifyWorkflowEvidence({
  id,
  workflow,
  required = true,
  run,
  artifacts = [],
  artifactPrefix,
} = {}) {
  if (!/^[A-Z0-9-]{2,40}$/.test(String(id || ''))) throw new Error('invalid evidence id');
  if (!/^[A-Za-z0-9_.-]+\.ya?ml$/.test(String(workflow || ''))) throw new Error('invalid workflow filename');
  if (!/^[A-Za-z0-9_.-]{6,180}$/.test(String(artifactPrefix || ''))) throw new Error('invalid artifact prefix');

  const base = {
    id,
    workflow,
    required: required === true,
    state: 'missing',
    reason: 'no_exact_sha_run',
    run_id: null,
    run_status: null,
    conclusion: null,
    event: null,
    created_at: null,
    updated_at: null,
    artifact_names: [],
  };

  if (!run) return base;

  const sanitized = {
    ...base,
    run_id: Number.isSafeInteger(run.id) ? run.id : null,
    run_status: typeof run.status === 'string' ? run.status : null,
    conclusion: typeof run.conclusion === 'string' ? run.conclusion : null,
    event: typeof run.event === 'string' ? run.event : null,
    created_at: validDate(run.created_at) ? new Date(run.created_at).toISOString() : null,
    updated_at: validDate(run.updated_at) ? new Date(run.updated_at).toISOString() : null,
  };

  if (run.status !== 'completed') {
    return {
      ...sanitized,
      state: ACTIVE_RUN_STATUSES.has(run.status) ? 'running' : 'blocked',
      reason: ACTIVE_RUN_STATUSES.has(run.status) ? `workflow_${run.status}` : 'invalid_workflow_status',
    };
  }

  if (run.conclusion !== TERMINAL_SUCCESS) {
    return {
      ...sanitized,
      state: 'failed',
      reason: `workflow_${run.conclusion || 'unknown'}`,
    };
  }

  const artifactNames = sanitizeArtifactNames(artifacts, artifactPrefix);
  if (artifactNames.length === 0) {
    return {
      ...sanitized,
      state: 'blocked',
      reason: 'missing_retained_artifact',
    };
  }

  return {
    ...sanitized,
    state: 'complete',
    reason: null,
    artifact_names: artifactNames,
  };
}

function assertUniqueEntries(entries, label) {
  const ids = new Set();
  for (const entry of entries) {
    if (!entry?.id || ids.has(entry.id)) throw new Error(`${label} contains a duplicate or missing id`);
    ids.add(entry.id);
  }
  return ids;
}

function blockerFrom(entry, boundary) {
  return {
    id: entry.id,
    boundary,
    state: entry.state,
    reason: entry.reason,
    run_id: entry.run_id,
  };
}

export function buildCloseoutWatchdogReport({
  releaseSha,
  lanes,
  orchestrators,
  safeLaneIds,
  generatedAt = new Date().toISOString(),
} = {}) {
  const exactSha = assertReleaseSha(releaseSha);
  if (!Array.isArray(lanes) || lanes.length === 0) throw new Error('lanes are required');
  if (!Array.isArray(orchestrators) || orchestrators.length !== 2) throw new Error('exactly two orchestrators are required');
  if (!Array.isArray(safeLaneIds) || safeLaneIds.length === 0) throw new Error('safeLaneIds are required');

  const laneIds = assertUniqueEntries(lanes, 'lanes');
  const orchestratorIds = assertUniqueEntries(orchestrators, 'orchestrators');
  if (!orchestratorIds.has('SAFE-BOOTSTRAP') || !orchestratorIds.has('FULL-CLOSEOUT')) {
    throw new Error('required closeout orchestrators are missing');
  }
  for (const safeLaneId of safeLaneIds) {
    if (!laneIds.has(safeLaneId)) throw new Error(`unknown safe lane: ${safeLaneId}`);
  }

  const safeLaneSet = new Set(safeLaneIds);
  const safeLanes = lanes.filter((lane) => safeLaneSet.has(lane.id));
  const protectedLanes = lanes.filter((lane) => !safeLaneSet.has(lane.id));
  const safeBootstrap = orchestrators.find((entry) => entry.id === 'SAFE-BOOTSTRAP');
  const fullCloseout = orchestrators.find((entry) => entry.id === 'FULL-CLOSEOUT');

  const safeLanesComplete = safeLanes.every((entry) => entry.state === 'complete');
  const allLanesComplete = lanes.every((entry) => entry.state === 'complete');
  const safeEvidenceRetained = safeLanesComplete && safeBootstrap.state === 'complete';
  const fullEvidenceRetained = allLanesComplete && fullCloseout.state === 'complete';
  const activeSafeEvidence = safeLanes.some((entry) => entry.state === 'running') || safeBootstrap.state === 'running';

  let decision = 'AWAITING_SAFE_RUNTIME_EVIDENCE';
  if (fullEvidenceRetained) decision = 'GO_EVIDENCE_RETAINED';
  else if (safeEvidenceRetained) decision = 'SAFE_EVIDENCE_RETAINED';
  else if (activeSafeEvidence) decision = 'SAFE_CAMPAIGN_IN_PROGRESS';
  else if (safeLanesComplete && safeBootstrap.state === 'missing') decision = 'AWAITING_SAFE_BOOTSTRAP';
  else if (safeBootstrap.state === 'failed' || safeBootstrap.state === 'blocked') decision = 'SAFE_BOOTSTRAP_BLOCKED';

  const blockers = [
    ...safeLanes.filter((entry) => entry.state !== 'complete').map((entry) => blockerFrom(entry, 'safe_runtime')),
    ...(safeBootstrap.state === 'complete' ? [] : [blockerFrom(safeBootstrap, 'safe_orchestrator')]),
  ];

  const protectedBoundaries = protectedLanes.map((entry) => ({
    id: entry.id,
    state: entry.state,
    reason: entry.reason,
    requires_explicit_authorization: entry.id === 'RECOVERY',
    requires_independent_evidence: entry.id === 'ASSURANCE',
  }));

  const nextActions = [];
  if (!safeLanesComplete) nextActions.push('Complete or repair every blocked safe runtime lane on the exact main SHA.');
  if (safeLanesComplete && safeBootstrap.state !== 'complete') nextActions.push('Run or repair the Enterprise Safe Runtime Bootstrap and retain its exact-SHA artifact.');
  if (safeEvidenceRetained && protectedLanes.some((entry) => entry.id === 'RECOVERY' && entry.state !== 'complete')) {
    nextActions.push('Execute the controlled recovery exercise only with explicit production authorization.');
  }
  if (safeEvidenceRetained && protectedLanes.some((entry) => entry.id === 'ASSURANCE' && entry.state !== 'complete')) {
    nextActions.push('Attach real independent security, legal, release and edge-provider assurance evidence.');
  }
  if (allLanesComplete && fullCloseout.state !== 'complete') nextActions.push('Run the protected full closeout and retain its exact-SHA GO artifact.');

  return {
    schema_version: 1,
    release_sha: exactSha,
    release_branch: 'main',
    generated_at: new Date(generatedAt).toISOString(),
    decision,
    score_claim: {
      official_completion_percent: null,
      official_remaining_percent: null,
      reason: 'The watchdog inventories retained exact-SHA evidence but never computes or promotes the canonical scorecard.',
    },
    counts: {
      lanes_total: lanes.length,
      lanes_complete: lanes.filter((entry) => entry.state === 'complete').length,
      safe_lanes_total: safeLanes.length,
      safe_lanes_complete: safeLanes.filter((entry) => entry.state === 'complete').length,
      safe_blockers: blockers.length,
      protected_lanes_complete: protectedLanes.filter((entry) => entry.state === 'complete').length,
    },
    safe_evidence_retained: safeEvidenceRetained,
    full_evidence_retained: fullEvidenceRetained,
    blockers,
    protected_boundaries: protectedBoundaries,
    next_actions: nextActions,
    lanes,
    orchestrators,
  };
}
