import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const BRANCH = 'main';
const RUNTIME_SCHEMA = 'risck-comply.p0-runtime-evidence-register.v1';
const FULL_SHA = /^[a-f0-9]{40}$/;
const LEGACY_RUNTIME_REGISTER = 'docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md';

function fileExists(path) {
  return existsSync(path);
}

function fileIncludes(path, token) {
  if (!existsSync(path)) return false;
  return readFileSync(path, 'utf8').includes(token);
}

function packageHasNoFloatingDeps() {
  if (!existsSync('package.json')) return false;
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const sections = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
  const floating = [];

  function isFloating(versionSpec) {
    const value = String(versionSpec ?? '').trim();
    return (
      value === 'latest' ||
      value === '*' ||
      value.startsWith('>=') ||
      value.includes(' || ') ||
      /^\d+\.x(?:\.x)?$/i.test(value) ||
      /^x(?:\.x){0,2}$/i.test(value)
    );
  }

  for (const section of sections) {
    for (const [name, versionSpec] of Object.entries(pkg[section] ?? {})) {
      if (isFloating(versionSpec)) floating.push(`${section}.${name}`);
    }
  }

  return floating.length === 0;
}

function progress(checks) {
  const completed = checks.filter((check) => check.done).length;
  const total = checks.length;
  const percent = Math.round((completed / total) * 100);
  return { completed, total, percent, remainingPercent: 100 - percent };
}

function loadAuthoritativeRuntimeEvidence() {
  const path = String(process.env.P0_RUNTIME_EVIDENCE_PATH ?? '').trim();
  if (!path) return null;
  if (!existsSync(path)) throw new Error(`P0 runtime evidence file is missing: ${path}`);

  const expectedSha = String(process.env.P0_PROGRESS_ASSESSED_SHA ?? '').trim().toLowerCase();
  if (!FULL_SHA.test(expectedSha)) {
    throw new Error('P0_PROGRESS_ASSESSED_SHA must be a full lowercase commit SHA when authoritative runtime evidence is supplied');
  }

  let document;
  try {
    document = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`P0 runtime evidence is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (document?.schema !== RUNTIME_SCHEMA) throw new Error('P0 runtime evidence schema is invalid');
  if (document?.repository !== REPOSITORY || document?.branch !== BRANCH) {
    throw new Error('P0 runtime evidence repository or branch is invalid');
  }
  if (String(document?.commitSha ?? '').toLowerCase() !== expectedSha) {
    throw new Error('P0 runtime evidence is not bound to the assessed SHA');
  }
  if (!document?.generatedAt || !Number.isFinite(Date.parse(document.generatedAt))) {
    throw new Error('P0 runtime evidence generatedAt is invalid');
  }
  if (!Array.isArray(document?.controls)) throw new Error('P0 runtime evidence controls are missing');

  return { path, expectedSha, document };
}

const authoritativeRuntimeEvidence = loadAuthoritativeRuntimeEvidence();

function runtimeEvidenceSatisfied(canonicalItem, legacyCompleteToken) {
  if (!authoritativeRuntimeEvidence) {
    return fileIncludes(LEGACY_RUNTIME_REGISTER, legacyCompleteToken);
  }

  const matches = authoritativeRuntimeEvidence.document.controls.filter((control) => control?.item === canonicalItem);
  if (matches.length !== 1) {
    throw new Error(`P0 runtime evidence must contain exactly one canonical control: ${canonicalItem}`);
  }
  const control = matches[0];
  return control?.status === 'Complete' && control?.satisfied === true;
}

function runtimeEvidenceSource() {
  if (!authoritativeRuntimeEvidence) {
    return {
      kind: 'legacy-policy-register',
      path: LEGACY_RUNTIME_REGISTER,
      exactShaBound: false,
    };
  }
  return {
    kind: 'authoritative-runtime-register',
    path: authoritativeRuntimeEvidence.path,
    commitSha: authoritativeRuntimeEvidence.expectedSha,
    exactShaBound: true,
  };
}

const repoReadinessChecks = [
  {
    id: 'lockfile',
    label: 'package-lock.json committed',
    done: fileExists('package-lock.json'),
    evidence: 'package-lock.json',
  },
  {
    id: 'floating-deps',
    label: 'No forbidden floating dependency specs',
    done: packageHasNoFloatingDeps(),
    evidence: 'node scripts/security/list-floating-dependencies.mjs',
  },
  {
    id: 'branch-protection-doc',
    label: 'Branch protection requirements documented',
    done:
      fileIncludes('docs/security/CI_CD_BRANCH_PROTECTION.md', 'Required status checks') &&
      fileIncludes('docs/security/CI_CD_BRANCH_PROTECTION.md', 'Code Owner'),
    evidence: 'docs/security/CI_CD_BRANCH_PROTECTION.md',
  },
  {
    id: 'required-security-workflows',
    label: 'Required security workflows exist',
    done:
      fileExists('.github/workflows/full-security-suite.yml') &&
      fileExists('.github/workflows/semgrep.yml') &&
      fileExists('.github/workflows/gitleaks.yml') &&
      fileExists('.github/workflows/actionlint.yml') &&
      fileExists('.github/workflows/scorecard.yml') &&
      fileExists('.github/workflows/codeql.yml') &&
      fileExists('.github/workflows/dependency-review.yml'),
    evidence: '.github/workflows',
  },
  {
    id: 'env-template',
    label: 'Production environment template and evidence policy exist',
    done:
      fileIncludes('.env.example', 'AUDIT_CHAIN_SIGNING_SECRET') &&
      fileExists('scripts/security/check-env-example-policy.mjs') &&
      fileExists('scripts/security/check-release-environment-evidence.mjs'),
    evidence: '.env.example + scripts/security/check-env-example-policy.mjs',
  },
  {
    id: 'rls-live-evidence-required',
    label: 'Live RLS validation evidence is required by release checklist',
    done:
      fileIncludes('docs/RELEASE_EVIDENCE_CHECKLIST.md', '`supabase-live-rls-validation.json`') &&
      fileIncludes('docs/RELEASE_EVIDENCE_CHECKLIST.md', '`npm run security:rls:live`'),
    evidence: 'docs/RELEASE_EVIDENCE_CHECKLIST.md',
  },
  {
    id: 'external-review-required',
    label: 'External security review or pentest evidence is required',
    done:
      fileIncludes('docs/RELEASE_EVIDENCE_CHECKLIST.md', '`external-security-review-or-pentest.json`') &&
      fileIncludes('docs/RELEASE_EVIDENCE_CHECKLIST.md', 'External review evidence'),
    evidence: 'docs/RELEASE_EVIDENCE_CHECKLIST.md',
  },
];

const runtimeEvidenceChecks = [
  {
    id: 'branch-protection-applied',
    label: 'Branch protection applied on main',
    done: runtimeEvidenceSatisfied(
      'Branch protection applied on `main`',
      '| Branch protection applied on `main` | Complete |',
    ),
  },
  {
    id: 'required-checks-applied',
    label: 'Required status checks configured in GitHub',
    done: runtimeEvidenceSatisfied(
      'Required status checks configured',
      '| Required status checks configured | Complete |',
    ),
  },
  {
    id: 'production-secrets-configured',
    label: 'Production secrets configured in provider secret stores',
    done: runtimeEvidenceSatisfied(
      'Production provider configuration evidence',
      '| Production secrets configured in provider secret stores | Complete |',
    ),
  },
  {
    id: 'rls-live-validation-complete',
    label: 'Supabase live RLS validation completed',
    done: runtimeEvidenceSatisfied(
      'Supabase live RLS validation completed',
      '| Supabase live RLS validation completed | Complete |',
    ),
  },
  {
    id: 'external-review-complete',
    label: 'External security review or pentest completed',
    done: runtimeEvidenceSatisfied(
      'External review',
      '| External security review or pentest completed | Complete |',
    ),
  },
].map((check) => ({
  ...check,
  evidence: authoritativeRuntimeEvidence ? authoritativeRuntimeEvidence.path : LEGACY_RUNTIME_REGISTER,
}));

const repoProgress = progress(repoReadinessChecks);
const runtimeProgress = progress(runtimeEvidenceChecks);
const combinedTotal = repoProgress.total + runtimeProgress.total;
const combinedCompleted = repoProgress.completed + runtimeProgress.completed;
const combinedPercent = Math.round((combinedCompleted / combinedTotal) * 100);

const report = {
  generatedAt: new Date().toISOString(),
  combined: {
    completed: combinedCompleted,
    total: combinedTotal,
    percent: combinedPercent,
    remainingPercent: 100 - combinedPercent,
  },
  repoReadiness: { ...repoProgress, checks: repoReadinessChecks },
  runtimeEvidence: {
    ...runtimeProgress,
    source: runtimeEvidenceSource(),
    checks: runtimeEvidenceChecks,
  },
};

const outputPath = String(process.env.P0_PROGRESS_OUTPUT_PATH ?? 'p0-enterprise-progress.json').trim() || 'p0-enterprise-progress.json';
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);

console.log('RISCK COMPLY P0 enterprise progress');
console.log('------------------------------------');
console.log(`Combined: ${combinedCompleted}/${combinedTotal} checks complete (${combinedPercent}%). Remaining: ${100 - combinedPercent}%.`);
console.log(`Repo readiness: ${repoProgress.completed}/${repoProgress.total} checks complete (${repoProgress.percent}%). Remaining: ${repoProgress.remainingPercent}%.`);
console.log(`Runtime evidence: ${runtimeProgress.completed}/${runtimeProgress.total} checks complete (${runtimeProgress.percent}%). Remaining: ${runtimeProgress.remainingPercent}%.`);

for (const check of repoReadinessChecks) {
  console.log(`${check.done ? 'OK' : 'BLOCKED'} repo:${check.id}: ${check.label}`);
}
for (const check of runtimeEvidenceChecks) {
  console.log(`${check.done ? 'OK' : 'BLOCKED'} runtime:${check.id}: ${check.label}`);
}
