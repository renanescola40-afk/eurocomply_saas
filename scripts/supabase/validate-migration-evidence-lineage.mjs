#!/usr/bin/env node

const FULL_SHA = /^[a-f0-9]{40}$/i;

export const CANONICAL_MIGRATION_EVIDENCE_PATHS = Object.freeze({
  decisions: 'docs/security/evidence/runtime/supabase-migration-reconciliation-decisions.json',
  stagingResult: 'docs/security/evidence/accepted/supabase-staging-rehearsal-result.json',
  productionRequest: 'docs/security/evidence/accepted/supabase-bounded-production-change-request.json',
});

const MODE_ALLOWED = Object.freeze({
  template: [],
  decision: [CANONICAL_MIGRATION_EVIDENCE_PATHS.decisions],
  execution: [CANONICAL_MIGRATION_EVIDENCE_PATHS.decisions],
  staging: [
    CANONICAL_MIGRATION_EVIDENCE_PATHS.decisions,
    CANONICAL_MIGRATION_EVIDENCE_PATHS.stagingResult,
  ],
  production: [
    CANONICAL_MIGRATION_EVIDENCE_PATHS.decisions,
    CANONICAL_MIGRATION_EVIDENCE_PATHS.stagingResult,
    CANONICAL_MIGRATION_EVIDENCE_PATHS.productionRequest,
  ],
});

function normalizePaths(paths) {
  return [...new Set(paths.map((value) => String(value ?? '').trim()).filter(Boolean))].sort();
}

export function validateMigrationEvidenceLineage({ subjectSha, currentSha, mode, changedPaths }) {
  const failures = [];
  const subject = String(subjectSha ?? '').toLowerCase();
  const current = String(currentSha ?? '').toLowerCase();
  const paths = normalizePaths(changedPaths ?? []);
  const allowed = MODE_ALLOWED[mode];

  if (!FULL_SHA.test(subject)) failures.push('subject_sha_invalid');
  if (!FULL_SHA.test(current)) failures.push('current_sha_invalid');
  if (!allowed) failures.push('mode_invalid');

  if (allowed) {
    const allowedSet = new Set(allowed);
    for (const path of paths) {
      if (!allowedSet.has(path)) failures.push(`non_evidence_change:${path}`);
    }
  }

  if (subject === current && paths.length > 0) failures.push('changed_paths_present_without_commit_delta');
  if (mode === 'template' && subject !== current) failures.push('template_requires_subject_to_be_current_main');

  return {
    accepted: failures.length === 0,
    subjectSha: subject,
    currentSha: current,
    mode,
    changedPaths: paths,
    allowedPaths: allowed ?? [],
    failures,
  };
}

async function main() {
  const [subjectSha, currentSha, mode, ...changedPaths] = process.argv.slice(2);
  if (!subjectSha || !currentSha || !mode) {
    throw new Error('usage: validate-migration-evidence-lineage.mjs <subject-sha> <current-sha> <mode> [changed-path ...]');
  }
  const result = validateMigrationEvidenceLineage({ subjectSha, currentSha, mode, changedPaths });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.accepted) process.exitCode = 2;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
