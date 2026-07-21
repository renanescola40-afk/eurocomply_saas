const ALLOWED_EVENTS = new Set(['push', 'workflow_dispatch']);

export function selectExactShaRun(runs, {
  releaseSha,
  notBefore = 0,
  allowExisting = false,
} = {}) {
  if (!/^[a-f0-9]{40}$/.test(String(releaseSha || ''))) {
    throw new Error('releaseSha must be a lowercase full Git SHA');
  }
  if (!Number.isFinite(Number(notBefore)) || Number(notBefore) < 0) {
    throw new Error('notBefore must be a non-negative timestamp');
  }
  return (Array.isArray(runs) ? runs : [])
    .filter((run) => Number.isSafeInteger(run?.id) && run.id > 0)
    .filter((run) => String(run?.head_sha || '').toLowerCase() === releaseSha)
    .filter((run) => run?.head_branch === 'main')
    .filter((run) => ALLOWED_EVENTS.has(run?.event))
    .filter((run) => allowExisting || new Date(run?.created_at || 0).getTime() >= Number(notBefore) - 5_000)
    .sort((a, b) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime())[0] ?? null;
}
