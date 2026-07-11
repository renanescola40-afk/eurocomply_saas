function parseTimestamp(value) {
  const timestamp = Date.parse(String(value ?? ''));
  return Number.isFinite(timestamp) ? timestamp : null;
}

const REQUIRED_TABLES = [
  'organizations', 'organization_members', 'ai_systems', 'compliance_tasks',
  'documents', 'risks', 'vendors', 'subscriptions', 'audit_logs', 'invitations',
  'onboarding_activation_runs', 'monitoring_preferences', 'profiles',
  'regulatory_updates', 'ai_assessments',
];

const TENANT_OPERATIONS = [
  'crossTenantReadDenied', 'crossTenantInsertDenied',
  'crossTenantUpdateDenied', 'crossTenantDeleteDenied',
];

export function validateSupabaseRlsRuntimeEvidence(
  evidence,
  {
    now = new Date(),
    maxAgeDays = 7,
    expectedRepository = 'renanescola40-afk/eurocomply_saas',
    expectedBranch = 'main',
  } = {},
) {
  const failures = [];
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(String(now));
  if (!Number.isFinite(nowMs)) return ['validation clock must be a valid timestamp'];

  if (evidence?.evidenceItem !== 'supabase-live-rls-validation') {
    failures.push('evidenceItem must be supabase-live-rls-validation');
  }

  const generatedAt = parseTimestamp(evidence?.generatedAt ?? evidence?.reviewedAt ?? evidence?.timestamp);
  if (generatedAt === null) failures.push('generatedAt must be an ISO-8601 timestamp');
  else {
    const ageMs = nowMs - generatedAt;
    if (ageMs < 0) failures.push('generatedAt must not be in the future');
    if (ageMs > maxAgeDays * 24 * 60 * 60 * 1000) failures.push(`generatedAt is older than ${maxAgeDays} days`);
  }

  if (evidence?.status === 'Exception') {
    const expiresAt = parseTimestamp(evidence?.exception?.expiresAt);
    if (expiresAt === null) failures.push('exception.expiresAt must be an ISO-8601 timestamp');
    else if (expiresAt < nowMs) failures.push('Supabase RLS exception has expired');
  }

  if (evidence?.status !== 'Complete') return failures;
  if (evidence?.outcome !== 'passed') failures.push('Complete evidence outcome must be passed');

  const runtime = evidence?.runtimeContext ?? {};
  if (runtime.generatedByGithubActions !== true) failures.push('runtimeContext.generatedByGithubActions must be true');
  if (runtime.repository !== expectedRepository) failures.push(`runtimeContext.repository must be ${expectedRepository}`);
  if (runtime.branch !== expectedBranch) failures.push(`runtimeContext.branch must be ${expectedBranch}`);
  if (!String(runtime.githubRunId ?? '').trim()) failures.push('runtimeContext.githubRunId is required');
  const commitSha = runtime.commitSha ?? evidence?.commitSha;
  if (!/^[a-f0-9]{40}$/i.test(String(commitSha ?? ''))) failures.push('runtime commit SHA must be a full commit SHA');

  if (evidence?.supabaseProjectReferenceRedacted !== true) failures.push('supabaseProjectReferenceRedacted must be true');
  if (!String(evidence?.supabaseProjectReference ?? '').startsWith('redacted:sha256:')) {
    failures.push('supabaseProjectReference must contain only a redacted digest');
  }

  const reviewed = Array.isArray(evidence?.tablesReviewed) ? evidence.tablesReviewed : [];
  for (const table of REQUIRED_TABLES) {
    const matches = reviewed.filter((entry) => entry?.table === table);
    if (matches.length !== 1) {
      failures.push(`tablesReviewed must contain exactly one ${table} entry`);
      continue;
    }
    const entry = matches[0];
    if (entry.status !== 'passed') failures.push(`${table} status must be passed`);
    if (entry.rlsEnabled !== true) failures.push(`${table} RLS must be enabled`);

    if (table === 'regulatory_updates') {
      if (entry.operations?.globalReferenceReadOnly !== true) failures.push('regulatory_updates must be authenticated read-only');
      if (entry.operations?.backendWritesDenied !== true) failures.push('regulatory_updates client writes must be denied');
      continue;
    }

    for (const operation of TENANT_OPERATIONS) {
      if (entry.operations?.[operation] !== true) failures.push(`${table}.${operation} must be true`);
    }
    if (entry.operations?.sameTenantReadAllowed !== true) failures.push(`${table}.sameTenantReadAllowed must be true`);
  }

  const profileCases = Array.isArray(evidence?.testCases)
    ? evidence.testCases.filter((test) => test?.table === 'profiles')
    : [];
  for (const operation of ['rls_enabled', 'cross_tenant_read', 'cross_tenant_insert', 'cross_tenant_update', 'cross_tenant_delete', 'same_tenant_read']) {
    const matches = profileCases.filter((test) => test?.operation === operation && test?.passed === true);
    if (matches.length !== 1) failures.push(`profiles:${operation} must have exactly one passing live test`);
  }

  if (evidence?.evidenceIntegrity?.containsSensitiveValues !== false) failures.push('evidenceIntegrity.containsSensitiveValues must be false');
  if (evidence?.evidenceIntegrity?.credentialsStored !== false) failures.push('evidenceIntegrity.credentialsStored must be false');

  return failures;
}
