export function isCreditEligibleWorkflowRun(run) {
  if (!run || typeof run !== 'object' || Array.isArray(run)) return false;

  // A failed retained-proof producer can emit a workflow_run event for the
  // Enterprise Production Gate where every job is intentionally skipped.
  // That run did not evaluate the release and must not replace the most recent
  // real gate evaluation for the same exact SHA.
  if (
    run.name === 'Enterprise Production Gate'
    && run.event === 'workflow_run'
    && run.conclusion === 'skipped'
  ) {
    return false;
  }

  return true;
}

export function latestCreditEligibleRunsByName(runs, { targetSha }) {
  const selected = new Map();

  for (const run of Array.isArray(runs) ? runs : []) {
    if (run?.head_sha !== targetSha) continue;
    if (!isCreditEligibleWorkflowRun(run)) continue;

    const existing = selected.get(run.name);
    if (!existing || new Date(run.created_at) > new Date(existing.created_at)) {
      selected.set(run.name, run);
    }
  }

  return selected;
}
