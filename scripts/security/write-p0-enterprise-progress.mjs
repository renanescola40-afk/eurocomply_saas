import { existsSync, readFileSync, writeFileSync } from 'node:fs';

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
    done: fileIncludes('docs/RELEASE_EVIDENCE_CHECKLIST.md', 'Live RLS validation completed against the target Supabase project'),
    evidence: 'docs/RELEASE_EVIDENCE_CHECKLIST.md',
  },
  {
    id: 'external-review-required',
    label: 'External security review or pentest evidence is required',
    done: fileIncludes('docs/RELEASE_EVIDENCE_CHECKLIST.md', 'External security review or pentest completed'),
    evidence: 'docs/RELEASE_EVIDENCE_CHECKLIST.md',
  },
];

const runtimeEvidenceChecks = [
  {
    id: 'branch-protection-applied',
    label: 'Branch protection applied on main',
    done: fileIncludes('docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md', '| Branch protection applied on `main` | Complete |'),
    evidence: 'docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md',
  },
  {
    id: 'required-checks-applied',
    label: 'Required status checks configured in GitHub',
    done: fileIncludes('docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md', '| Required status checks configured | Complete |'),
    evidence: 'docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md',
  },
  {
    id: 'production-secrets-configured',
    label: 'Production secrets configured in provider secret stores',
    done: fileIncludes('docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md', '| Production secrets configured in provider secret stores | Complete |'),
    evidence: 'docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md',
  },
  {
    id: 'rls-live-validation-complete',
    label: 'Supabase live RLS validation completed',
    done: fileIncludes('docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md', '| Supabase live RLS validation completed | Complete |'),
    evidence: 'docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md',
  },
  {
    id: 'external-review-complete',
    label: 'External security review or pentest completed',
    done: fileIncludes('docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md', '| External security review or pentest completed | Complete |'),
    evidence: 'docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md',
  },
];

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
  runtimeEvidence: { ...runtimeProgress, checks: runtimeEvidenceChecks },
};

writeFileSync('p0-enterprise-progress.json', `${JSON.stringify(report, null, 2)}\n`);

console.log('EuroComply P0 enterprise progress');
console.log('-----------------------------------');
console.log(`Combined: ${combinedCompleted}/${combinedTotal} checks complete (${combinedPercent}%). Remaining: ${100 - combinedPercent}%.`);
console.log(`Repo readiness: ${repoProgress.completed}/${repoProgress.total} checks complete (${repoProgress.percent}%). Remaining: ${repoProgress.remainingPercent}%.`);
console.log(`Runtime evidence: ${runtimeProgress.completed}/${runtimeProgress.total} checks complete (${runtimeProgress.percent}%). Remaining: ${runtimeProgress.remainingPercent}%.`);

for (const check of repoReadinessChecks) {
  console.log(`${check.done ? 'OK' : 'BLOCKED'} repo:${check.id}: ${check.label}`);
}
for (const check of runtimeEvidenceChecks) {
  console.log(`${check.done ? 'OK' : 'BLOCKED'} runtime:${check.id}: ${check.label}`);
}
